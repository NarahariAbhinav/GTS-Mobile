const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { db, admin } = require('./firebase');
const { sendDailyManagerReport } = require('./emailService');

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// HELPER: Get department-based automated status
// =========================================================
function getAutoStatus(department) {
    const dept = (department || '').toLowerCase();
    if (dept.includes('qa') || dept.includes('quality')) return 'QA Pending';
    if (dept.includes('production') || dept.includes('manufacturing')) return 'In Production';
    if (dept.includes('dispatch') || dept.includes('logistics')) return 'Ready for Dispatch';
    if (dept.includes('sampling')) return 'In Sampling';
    return 'In Development';
}

// =========================================================
// FIREBASE AUTH TOKEN VERIFICATION MIDDLEWARE
// =========================================================
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No auth token provided.' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Contains uid, email
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.uid) return res.status(401).json({ error: 'Unauthorized.' });
        
        // Find employee by Firebase Auth UID or Email
        const snapshot = await db.collection('employees').where('uid', '==', req.user.uid).limit(1).get();
        let doc = snapshot.empty ? null : snapshot.docs[0];
        
        if (!doc) {
             const emailSnap = await db.collection('employees').where('email', '==', req.user.email).limit(1).get();
             doc = emailSnap.empty ? null : emailSnap.docs[0];
        }

        if (!doc || doc.data().role !== 'Admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// =========================================================
// FCM PUSH NOTIFICATIONS HELPER
// =========================================================
const sendPushNotification = async (userId, title, body) => {
    try {
        const userDoc = await db.collection('employees').doc(userId).get();
        if (!userDoc.exists) return;
        const fcmToken = userDoc.data().fcm_token;
        if (!fcmToken) return; // User hasn't registered a device token

        await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            android: { priority: 'high' },
            apns: { payload: { aps: { contentAvailable: true } } }
        });
        console.log(`Push sent to user ${userId}`);
    } catch (err) {
        console.error(`Failed to send push to ${userId}:`, err.message);
    }
};

app.put('/api/employees/:id/fcm-token', verifyToken, async (req, res) => {
    try {
        const { fcm_token } = req.body;
        if (req.user.uid !== req.params.id) {
            const adminCheck = await db.collection('employees').doc(req.user.uid).get();
            if (!adminCheck.exists || adminCheck.data().role !== 'Admin') {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        await db.collection('employees').doc(req.params.id).update({ fcm_token });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// AUTH / LOGIN (Firebase Email Auth)
app.post('/api/login', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No auth token provided.' });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        // 1. Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;

        // 2. Look up the employee profile in Firestore by email
        const snapshot = await db.collection('employees')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(403).json({ error: 'No employee profile found for this account. Please contact your Admin.' });
        }

        const doc = snapshot.docs[0];
        const userData = doc.data();

        res.json({
            success: true,
            user: {
                id: doc.id,
                employee_name: userData.employee_name,
                email: userData.email,
                department: userData.department,
                designation: userData.designation,
                role: userData.role,
                phone_number: userData.phone_number,
                email_report_enabled: userData.email_report_enabled || false
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed: ' + err.message });
    }
});

// =========================================================
// DASHBOARD
// =========================================================
app.get('/api/dashboard', verifyToken, async (req, res) => {
    try {
        const [samplesSnap, employeesSnap, handoversSnap] = await Promise.all([
            db.collection('samples').get(),
            db.collection('employees').get(),
            db.collection('handovers').where('transfer_status', '==', 'Pending').get()
        ]);

        const samples = samplesSnap.docs.map(d => d.data());

        const totalSamples = samples.length;
        const totalEmployees = employeesSnap.size;
        const pendingTransfers = handoversSnap.size;
        const pendingQA = samples.filter(s => s.status === 'QA Pending').length;
        const inTransit = samples.filter(s =>
            s.current_holder_id && !['Approved', 'Dispatched', 'Ready for Dispatch'].includes(s.status)
        ).length;

        res.json({ totalSamples, totalEmployees, inTransit, pendingQA, pendingTransfers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// EMPLOYEES
// =========================================================
app.get('/api/employees', verifyToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 0; // 0 = no limit (fetch all)
        let query = db.collection('employees').orderBy('employee_name');

        if (limit > 0) {
            if (req.query.startAfter) {
                const startDoc = await db.collection('employees').doc(req.query.startAfter).get();
                if (startDoc.exists) query = query.startAfter(startDoc);
            }
            query = query.limit(limit + 1); // fetch 1 extra to check hasMore
        }

        const snapshot = await query.get();
        const docs = snapshot.docs;
        const hasMore = limit > 0 && docs.length > limit;
        const sliced = hasMore ? docs.slice(0, limit) : docs;
        const rows = sliced.map(doc => ({ id: doc.id, ...doc.data(), password: undefined }));
        res.json(limit > 0 ? { data: rows, hasMore } : rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', verifyToken, requireAdmin, async (req, res) => {
    const { employee_name, department, designation, phone_number, role, password, email, email_report_enabled } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required to create an employee account.' });
    }

    try {
        // 1. Auto-create Firebase Auth account for this employee
        const authUser = await admin.auth().createUser({
            email: email,
            password: password || '1234',       // default password
            displayName: employee_name,
        });

        // 2. Save employee profile in Firestore (linked by Firebase UID)
        const docRef = await db.collection('employees').doc(authUser.uid).set({
            employee_name,
            email,
            department,
            designation: designation || '',
            phone_number: phone_number || '',
            role: role || 'Employee',
            email_report_enabled: email_report_enabled || false,
            uid: authUser.uid,
            created_at: new Date()
        });

        res.json({ 
            id: authUser.uid, 
            employee_name, 
            email,
            department, 
            designation, 
            phone_number, 
            role: role || 'Employee',
            email_report_enabled: email_report_enabled || false,
            message: `Firebase account created for ${email}. Default password: ${password || '1234'}`
        });
    } catch (err) {
        // Handle duplicate email error
        if (err.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: `An account with email "${email}" already exists.` });
        }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/employees/:id', verifyToken, requireAdmin, async (req, res) => {
    const { employee_name, department, designation, phone_number, role, email_report_enabled } = req.body;
    try {
        await db.collection('employees').doc(req.params.id).update({
            employee_name, department, designation, phone_number, role: role || 'Employee',
            email_report_enabled: email_report_enabled !== undefined ? email_report_enabled : false
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/employees/:id', verifyToken, requireAdmin, async (req, res) => {
    const employeeId = req.params.id;
    try {
        // 1. Get the employee doc to find Firebase Auth UID
        const empDoc = await db.collection('employees').doc(employeeId).get();
        if (!empDoc.exists) {
            return res.status(404).json({ error: 'Employee not found.' });
        }

        const empData = empDoc.data();

        // 2. Delete Firebase Auth account AND revoke tokens if UID exists
        // ── LOOPHOLE FIX #8: Immediately revoke all sessions so fired employees can't use the app ──
        if (empData.uid) {
            try {
                await admin.auth().revokeRefreshTokens(empData.uid);
                console.log(`🔒 Firebase Auth tokens revoked for: ${empData.employee_name}`);
                await admin.auth().deleteUser(empData.uid);
                console.log(`🗑️  Firebase Auth account deleted for: ${empData.employee_name}`);
            } catch (authErr) {
                // Auth account may not exist, continue anyway
                console.warn(`⚠️  Could not delete Auth account: ${authErr.message}`);
            }
        }

        // 3. Delete Firestore document
        await db.collection('employees').doc(employeeId).delete();

        res.json({ success: true, message: `Employee "${empData.employee_name}" deleted successfully.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// SAMPLES
// =========================================================
app.get('/api/samples', verifyToken, async (req, res) => {
    try {
        const limitNum = parseInt(req.query.limit) || 0;
        const search = req.query.search ? req.query.search.toLowerCase() : '';

        let query = db.collection('samples').orderBy('created_at', 'desc');

        // IF NO SEARCH: Use native Firestore pagination
        if (!search && limitNum > 0) {
            if (req.query.startAfter) {
                const startDoc = await db.collection('samples').doc(req.query.startAfter).get();
                if (startDoc.exists) query = query.startAfter(startDoc);
            }
            query = query.limit(limitNum + 1); // fetch 1 extra for hasMore
            
            const [samplesSnap, employeesSnap] = await Promise.all([query.get(), db.collection('employees').get()]);
            const employeeMap = {};
            employeesSnap.docs.forEach(doc => { employeeMap[doc.id] = doc.data().employee_name; });

            const docs = samplesSnap.docs;
            const hasMore = docs.length > limitNum;
            const sliced = hasMore ? docs.slice(0, limitNum) : docs;

            const rows = sliced.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id, ...data,
                    created_at: data.created_at?.toDate?.() || data.created_at,
                    current_holder_name: data.current_holder_id ? (employeeMap[data.current_holder_id] || null) : null
                };
            });
            return res.json({ data: rows, hasMore });
        }

        // IF SEARCHING: Fallback to in-memory, but limit to prevent crashes
        if (search) {
            query = query.limit(1000); 
        }
        
        const [samplesSnap, employeesSnap] = await Promise.all([query.get(), db.collection('employees').get()]);
        const employeeMap = {};
        employeesSnap.docs.forEach(doc => { employeeMap[doc.id] = doc.data().employee_name; });

        let allDocs = samplesSnap.docs;
        if (search) {
            allDocs = allDocs.filter(doc => {
                const data = doc.data();
                return (data.sample_name || '').toLowerCase().includes(search) ||
                       (data.style_number || '').toLowerCase().includes(search) ||
                       (data.developed_for || '').toLowerCase().includes(search) ||
                       (data.current_department || '').toLowerCase().includes(search) ||
                       (employeeMap[data.current_holder_id] || '').toLowerCase().includes(search);
            });
        }

        let paginatedDocs = allDocs;
        let hasMore = false;
        if (limitNum > 0) {
            let startIndex = 0;
            if (req.query.startAfter) {
                startIndex = allDocs.findIndex(d => d.id === req.query.startAfter) + 1;
                if (startIndex === 0) startIndex = 0;
            }
            paginatedDocs = allDocs.slice(startIndex, startIndex + limitNum);
            hasMore = startIndex + limitNum < allDocs.length;
        }

        const rows = paginatedDocs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, ...data,
                created_at: data.created_at?.toDate?.() || data.created_at,
                current_holder_name: data.current_holder_id ? (employeeMap[data.current_holder_id] || null) : null
            };
        });

        res.json(limitNum > 0 ? { data: rows, hasMore } : rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/samples', verifyToken, async (req, res) => {
    const { sample_name, style_number, developed_for, status } = req.body;
    try {
        const docRef = await db.collection('samples').add({
            sample_name,
            style_number,
            developed_for: developed_for || '',
            status: status || 'In Development',
            current_holder_id: null,
            current_department: '',
            created_at: new Date()
        });
        res.json({ id: docRef.id, sample_name, style_number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/samples/:id', verifyToken, async (req, res) => {
    const { sample_name, style_number, developed_for } = req.body;
    try {
        await db.collection('samples').doc(req.params.id).update({
            sample_name, style_number, developed_for: developed_for || ''
        });

        // Audit Log
        await db.collection('handovers').add({
            sample_id: req.params.id,
            from_employee_id: null,
            to_employee_id: null,
            department: 'System Update',
            remarks: `Sample details edited: ${sample_name} (${style_number}) - ${developed_for || 'No Brand'}`,
            transfer_status: 'Edited',
            handover_date: new Date(),
            created_at: new Date()
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// BULK IMPORT SAMPLES (from Excel)
// =========================================================
app.post('/api/samples/bulk', verifyToken, requireAdmin, async (req, res) => {
    const { samples } = req.body; // array of { sample_name, style_number, developed_for }
    if (!Array.isArray(samples) || samples.length === 0) {
        return res.status(400).json({ error: 'No samples provided.' });
    }
    if (samples.length > 500) {
        return res.status(400).json({ error: 'Maximum 500 samples per import.' });
    }
    try {
        const existingSnap = await db.collection('samples').select('style_number').get();
        const existingStyles = new Set(existingSnap.docs.map(d => (d.data().style_number || '').toLowerCase()));

        const batch = db.batch();
        const results = [];
        let skipped = 0;

        samples.forEach(s => {
            const style = s.style_number?.trim() || '';
            if (!style || existingStyles.has(style.toLowerCase())) {
                skipped++;
                return;
            }
            existingStyles.add(style.toLowerCase());

            const ref = db.collection('samples').doc();
            batch.set(ref, {
                sample_name: s.sample_name?.trim() || '',
                style_number: style,
                developed_for: s.developed_for?.trim() || '',
                status: 'In Development',
                current_holder_id: null,
                current_department: '',
                created_at: new Date()
            });
            results.push({ id: ref.id, style_number: style, sample_name: s.sample_name });
        });

        if (results.length > 0) {
            await batch.commit();
        }
        res.json({ success: true, created: results.length, skipped, samples: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// INITIATE TRANSFER (Handover / Batch / External Dispatch)
// =========================================================
app.post('/api/handover', verifyToken, async (req, res) => {
    let { sample_id, sample_ids, to_employee_id, department, remarks, is_external, external_vendor, courier_name, awb_number } = req.body;
    try {
        if (!sample_ids && sample_id) {
            sample_ids = [sample_id];
        }
        if (!sample_ids || sample_ids.length === 0) {
            return res.status(400).json({ error: 'No samples provided for transfer.' });
        }

        const batch = db.batch();
        let skipped = 0;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const transactionIds = [];
        
        const samplesRefs = sample_ids.map(id => db.collection('samples').doc(id));
        const samplesDocs = await db.getAll(...samplesRefs);

        for (let i = 0; i < samplesDocs.length; i++) {
            const sDoc = samplesDocs[i];
            if (!sDoc.exists) { skipped++; continue; }
            const s_id = sDoc.id;
            const real_from_employee_id = sDoc.data().current_holder_id || null;

            if (!is_external && real_from_employee_id && real_from_employee_id === to_employee_id) {
                skipped++; continue;
            }

            const recentTransfersSnap = await db.collection('handovers')
                .where('sample_id', '==', s_id)
                .get();
            
            const recentCount = recentTransfersSnap.docs.filter(doc => {
                const data = doc.data();
                const senderMatches = (data.from_employee_id || '') === (real_from_employee_id || '');
                const isRecent = data.created_at && data.created_at.toDate() >= oneHourAgo;
                return senderMatches && isRecent;
            }).length;

            if (recentCount >= 3) {
                skipped++;
                continue; 
            }

            const txnRef = db.collection('handovers').doc();
            transactionIds.push(txnRef.id);
            
            if (is_external) {
                batch.set(txnRef, {
                    sample_id: s_id,
                    from_employee_id: real_from_employee_id,
                    to_employee_id: 'EXTERNAL',
                    department: 'External Vendor / Courier',
                    remarks: remarks || '',
                    is_external: true,
                    external_vendor: external_vendor || '',
                    courier_name: courier_name || '',
                    awb_number: awb_number || '',
                    transfer_status: 'Accepted',
                    handover_date: new Date(),
                    accepted_at: new Date(),
                    created_at: new Date()
                });

                batch.update(sDoc.ref, {
                    current_holder_id: 'EXTERNAL',
                    current_holder_name: 'External: ' + external_vendor,
                    current_department: 'Dispatched via ' + courier_name + (awb_number ? ' (AWB: ' + awb_number + ')' : ''),
                    status: 'Dispatched Externally'
                });

            } else {
                batch.set(txnRef, {
                    sample_id: s_id,
                    from_employee_id: real_from_employee_id,
                    to_employee_id,
                    department,
                    remarks: remarks || '',
                    transfer_status: 'Pending',
                    handover_date: new Date(),
                    accepted_at: null,
                    rejected_at: null,
                    rejection_reason: null,
                    created_at: new Date()
                });
            }
        }

        if (transactionIds.length === 0) {
            return res.status(429).json({ error: 'All selected samples failed transfer rules or rate limits.' });
        }

        await batch.commit();

        if (!is_external) {
            const firstSampleDoc = samplesDocs[0];
            const firstSampleName = firstSampleDoc.exists ? firstSampleDoc.data().sample_name : 'Item';
            
            let message = `You have ${transactionIds.length} new sample(s) pending transfer.`;
            if (transactionIds.length === 1) {
                message = `You have a new transfer pending for "${firstSampleName}".`;
            }

            const notifRef = db.collection('notifications').doc();
            await notifRef.set({
                user_id: to_employee_id,
                title: 'New Transfer Pending',
                message: message,
                type: 'handover_pending',
                related_id: transactionIds[0],
                read: false,
                created_at: new Date()
            });
            await sendPushNotification(to_employee_id, 'New Transfer Pending', message);
        }

        res.json({ 
            success: true, 
            message: is_external ? 'External dispatch recorded successfully.' : `Transfer initiated for ${transactionIds.length} sample(s).`,
            skipped 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// ACCEPT TRANSFER
// =========================================================
app.post('/api/handover/:id/accept', verifyToken, async (req, res) => {
    const transactionId = req.params.id;
    try {
        // ── SERVER-SIDE BARCODE VERIFICATION ENFORCEMENT ──
        // The client MUST send verified_by_scan: true, which is only set
        // after the camera successfully matches the barcode. This prevents
        // employees from bypassing the scan via any workaround.
        const { verified_by_scan } = req.body || {};
        if (!verified_by_scan) {
            return res.status(403).json({ error: 'Barcode scan verification is required to accept a transfer. Please scan the garment barcode.' });
        }

        const txnRef = db.collection('handovers').doc(transactionId);
        const txnDoc = await txnRef.get();

        if (!txnDoc.exists || txnDoc.data().transfer_status !== 'Pending') {
            return res.status(404).json({ error: 'Transaction not found or already processed.' });
        }

        const txn = txnDoc.data();

        // Mark as accepted (with scan verification audit)
        await txnRef.update({ transfer_status: 'Accepted', accepted_at: new Date(), verified_by_scan: true });

        // Auto-determine status from department
        const autoStatus = getAutoStatus(txn.department);

        // Update sample's holder and status
        await db.collection('samples').doc(txn.sample_id).update({
            current_holder_id: txn.to_employee_id,
            current_department: txn.department,
            status: autoStatus
        });

        // Auto-cancel ALL other pending transfers for this same sample
        // (prevents stale "Pending" records from remaining after acceptance)
        const otherPending = await db.collection('handovers')
            .where('sample_id', '==', txn.sample_id)
            .where('transfer_status', '==', 'Pending')
            .get();

        const cancelBatch = db.batch();
        otherPending.forEach(doc => {
            if (doc.id !== transactionId) {
                cancelBatch.update(doc.ref, {
                    transfer_status: 'Cancelled',
                    rejected_at: new Date(),
                    rejection_reason: 'Auto-cancelled: another transfer was accepted for this sample.'
                });
            }
        });
        await cancelBatch.commit();

        // In-App Notification: notify the original sender
        if (txn.from_employee_id) {
            const [receiverDoc, sampleDoc] = await Promise.all([
                db.collection('employees').doc(txn.to_employee_id).get(),
                db.collection('samples').doc(txn.sample_id).get()
            ]);

            const receiver = receiverDoc.data();
            const sample = sampleDoc.data();

            const msgBody = `${receiver?.employee_name || 'Someone'} accepted the transfer of "${sample?.sample_name || 'the sample'}".`;
            await db.collection('notifications').add({
                user_id: txn.from_employee_id,
                title: 'Transfer Accepted ✅',
                message: msgBody,
                type: 'handover_accepted',
                related_id: txn.sample_id,
                read: false,
                created_at: new Date()
            });
            await sendPushNotification(txn.from_employee_id, 'Transfer Accepted ✅', msgBody);
        }

        res.json({ success: true, message: 'Transfer accepted. Sample ownership updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// REJECT TRANSFER
// =========================================================
app.post('/api/handover/:id/reject', verifyToken, async (req, res) => {
    const transactionId = req.params.id;
    const { rejection_reason } = req.body;
    try {
        const txnRef = db.collection('handovers').doc(transactionId);
        const txnDoc = await txnRef.get();

        if (!txnDoc.exists || txnDoc.data().transfer_status !== 'Pending') {
            return res.status(404).json({ error: 'Transaction not found or already processed.' });
        }

        const txn = txnDoc.data();
        await txnRef.update({
            transfer_status: 'Rejected',
            rejected_at: new Date(),
            rejection_reason: rejection_reason || null
        });

        // ── LOOPHOLE FIX #4: Track excessive rejections ──
        // Count this employee's rejections in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const rejectHistorySnap = await db.collection('handovers')
            .where('to_employee_id', '==', txn.to_employee_id)
            .where('transfer_status', '==', 'Rejected')
            .get();

        const recentRejectsCount = rejectHistorySnap.docs.filter(doc => {
            const data = doc.data();
            return data.rejected_at && data.rejected_at.toDate() >= twentyFourHoursAgo;
        }).length;

        // If employee rejected 3+ transfers today, alert all admins
        if (recentRejectsCount >= 3) {
            const rejectorDoc = await db.collection('employees').doc(txn.to_employee_id).get();
            const rejectorName = rejectorDoc.data()?.employee_name || 'Unknown';

            const adminsSnap = await db.collection('employees').where('role', '==', 'Admin').get();
            const alertBatch = db.batch();
            const msgBody = `${rejectorName} has rejected ${recentRejectsCount} transfers in the last 24 hours. This may require attention.`;
            adminsSnap.forEach(adminDoc => {
                const notifRef = db.collection('notifications').doc();
                alertBatch.set(notifRef, {
                    user_id: adminDoc.id,
                    title: '⚠️ Frequent Rejections Alert',
                    message: msgBody,
                    type: 'admin_alert',
                    related_id: txn.to_employee_id,
                    read: false,
                    created_at: new Date()
                });
                sendPushNotification(adminDoc.id, '⚠️ Frequent Rejections Alert', msgBody);
            });
            await alertBatch.commit();
        }

        // In-App Notification: notify the original sender
        if (txn.from_employee_id) {
            const [receiverDoc, sampleDoc] = await Promise.all([
                db.collection('employees').doc(txn.to_employee_id).get(),
                db.collection('samples').doc(txn.sample_id).get()
            ]);

            const receiver = receiverDoc.data();
            const sample = sampleDoc.data();

            await db.collection('notifications').add({
                user_id: txn.from_employee_id,
                title: 'Transfer Rejected ❌',
                message: `${receiver?.employee_name || 'Someone'} rejected the transfer of "${sample?.sample_name || 'the sample'}". ${rejection_reason ? `Reason: ${rejection_reason}` : ''}`,
                type: 'handover_rejected',
                related_id: txn.sample_id,
                read: false,
                created_at: new Date()
            });
        }

        res.json({ success: true, message: 'Transfer rejected. Sample remains with sender.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// CANCEL TRANSFER (By Sender)
// =========================================================
app.post('/api/handover/:id/cancel', verifyToken, async (req, res) => {
    const transactionId = req.params.id;
    try {
        const txnRef = db.collection('handovers').doc(transactionId);
        const txnDoc = await txnRef.get();

        if (!txnDoc.exists || txnDoc.data().transfer_status !== 'Pending') {
            return res.status(404).json({ error: 'Transaction not found or already processed.' });
        }

        const txn = txnDoc.data();
        await txnRef.update({
            transfer_status: 'Cancelled',
            rejected_at: new Date(),
            rejection_reason: 'Sender cancelled the transfer request'
        });

        // In-App Notification: notify the receiver that it was cancelled
        if (txn.to_employee_id) {
            const [senderDoc, sampleDoc] = await Promise.all([
                txn.from_employee_id ? db.collection('employees').doc(txn.from_employee_id).get() : Promise.resolve(null),
                db.collection('samples').doc(txn.sample_id).get()
            ]);

            const senderName = senderDoc?.data()?.employee_name || 'Admin';
            const sample = sampleDoc.data();

            await db.collection('notifications').add({
                user_id: txn.to_employee_id,
                title: 'Transfer Cancelled 🚫',
                message: `${senderName} cancelled the transfer of "${sample?.sample_name || 'the sample'}".`,
                type: 'handover_rejected',
                related_id: txn.sample_id,
                read: false,
                created_at: new Date()
            });
        }

        res.json({ success: true, message: 'Transfer cancelled successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// PENDING TRANSFERS FOR EMPLOYEE
// =========================================================
app.get('/api/pending-transfers/:employeeId', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('handovers')
            .where('to_employee_id', '==', req.params.employeeId)
            .where('transfer_status', '==', 'Pending')
            .get();

        const handovers = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data(), handover_date: doc.data().handover_date?.toDate?.() }))
            .sort((a, b) => (b.handover_date || 0) - (a.handover_date || 0));

        // Enrich with employee & sample names
        const enriched = await Promise.all(handovers.map(async txn => {
            const [sampleDoc, fromDoc] = await Promise.all([
                txn.sample_id ? db.collection('samples').doc(txn.sample_id).get() : Promise.resolve(null),
                txn.from_employee_id ? db.collection('employees').doc(txn.from_employee_id).get() : Promise.resolve(null)
            ]);

            return {
                ...txn,
                sample_name: sampleDoc?.data()?.sample_name || 'Unknown',
                style_number: sampleDoc?.data()?.style_number || '',
                developed_for: sampleDoc?.data()?.developed_for || '',
                from_employee_name: fromDoc?.data()?.employee_name || 'Admin',
                from_department: fromDoc?.data()?.department || ''
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// MY SAMPLES (Employee Workspace)
// =========================================================
app.get('/api/my-samples/:employeeId', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('samples')
            .where('current_holder_id', '==', req.params.employeeId)
            .get();

        const rows = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data(), created_at: doc.data().created_at?.toDate?.() }))
            .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// SAMPLE TIMELINE / HISTORY
// =========================================================
app.get('/api/samples/:id/history', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('handovers')
            .where('sample_id', '==', req.params.id)
            .get();

        const handovers = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data(), handover_date: doc.data().handover_date?.toDate?.() }))
            .sort((a, b) => (b.handover_date || 0) - (a.handover_date || 0));

        const enriched = await Promise.all(handovers.map(async txn => {
            const [fromDoc, toDoc] = await Promise.all([
                txn.from_employee_id ? db.collection('employees').doc(txn.from_employee_id).get() : Promise.resolve(null),
                txn.to_employee_id ? db.collection('employees').doc(txn.to_employee_id).get() : Promise.resolve(null)
            ]);
            return {
                ...txn,
                from_employee_name: fromDoc?.data()?.employee_name || null,
                to_employee_name: toDoc?.data()?.employee_name || 'Unknown'
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// EMAIL DAILY REPORT
// =========================================================
app.post('/api/admin/send-report', verifyToken, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    try {
        const empSnap = await db.collection('employees').where('email', '==', req.user.email).limit(1).get();
        if (empSnap.empty) return res.status(403).json({ error: 'User profile not found.' });
        const empDoc = empSnap.docs[0].data();
        
        if (empDoc.role !== 'Admin' && !empDoc.email_report_enabled) {
             return res.status(403).json({ error: 'You do not have permission to send reports.' });
        }
        if (email.toLowerCase() !== req.user.email.toLowerCase() && empDoc.role !== 'Admin') {
             return res.status(403).json({ error: 'You can only send reports to your own email address.' });
        }

        const samplesSnap = await db.collection('samples').get();
        const samples = samplesSnap.docs.map(d => d.data());

        const totalSamples = samples.length;
        const pendingQA = samples.filter(s => s.status === 'QA Pending').length;
        const inProduction = samples.filter(s => s.status === 'In Production').length;
        const dispatched = samples.filter(s => s.status === 'Dispatched' || s.status === 'Ready for Dispatch').length;

        await sendDailyManagerReport(email, totalSamples, pendingQA, inProduction, dispatched);
        res.json({ success: true, message: 'Daily report sent successfully via Email!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/send-excel', verifyToken, async (req, res) => {
    const { email, csvData } = req.body;
    if (!email || !csvData) return res.status(400).json({ error: 'Email and CSV data are required.' });

    try {
        const empSnap = await db.collection('employees').where('email', '==', req.user.email).limit(1).get();
        if (empSnap.empty) return res.status(403).json({ error: 'User profile not found.' });
        const empDoc = empSnap.docs[0].data();
        
        if (empDoc.role !== 'Admin' && !empDoc.email_report_enabled) {
             return res.status(403).json({ error: 'You do not have permission to send reports.' });
        }
        if (email.toLowerCase() !== req.user.email.toLowerCase() && empDoc.role !== 'Admin') {
             return res.status(403).json({ error: 'You can only send reports to your own email address.' });
        }

        const { sendExcelReport } = require('./emailService');
        await sendExcelReport(email, csvData);
        res.json({ success: true, message: 'Excel report sent successfully via Email!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// NOTIFICATIONS
// =========================================================
app.get('/api/notifications/:employeeId', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('notifications')
            .where('user_id', '==', req.params.employeeId)
            .get();

        const rows = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.() || data.created_at
            };
        });
        
        // Sort in memory to avoid Firestore composite index requirement
        rows.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        
        // Limit to 50
        const limitedRows = rows.slice(0, 50);

        res.json(limitedRows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        await db.collection('notifications').doc(req.params.id).update({ read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all/:employeeId', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('notifications')
            .where('user_id', '==', req.params.employeeId)
            .where('read', '==', false)
            .get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
        res.json({ success: true, count: snapshot.size });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// START SERVER
// =========================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend server running on port ${PORT} with Firebase Firestore`);
    console.log(`🔥 Connected to Firebase project: garment-tracker-b9473`);
    console.log(`🔐 Auth, Transfers, Timeline, Notifications ready.`);
});
