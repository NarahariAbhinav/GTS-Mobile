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
// AUTH / LOGIN (Firebase Email Auth)
// After Firebase verifies email+password on the client,
// the mobile app sends the ID token here to get the
// employee profile (role, department, etc.) from Firestore.
// =========================================================
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
                phone_number: userData.phone_number
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed: ' + err.message });
    }
});

// =========================================================
// DASHBOARD
// =========================================================
app.get('/api/dashboard', async (req, res) => {
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
app.get('/api/employees', async (req, res) => {
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
    const { employee_name, department, designation, phone_number, role, password, email } = req.body;

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
    const { employee_name, department, designation, phone_number, role } = req.body;
    try {
        await db.collection('employees').doc(req.params.id).update({
            employee_name, department, designation, phone_number, role: role || 'Employee'
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

        // 2. Delete Firebase Auth account if UID exists
        if (empData.uid) {
            try {
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
app.get('/api/samples', async (req, res) => {
    try {
        const limitNum = parseInt(req.query.limit) || 0;
        const search = req.query.search ? req.query.search.toLowerCase() : '';

        // Fetch all docs if searching, else optimize by fetching only needed
        let query = db.collection('samples').orderBy('created_at', 'desc');

        const [samplesSnap, employeesSnap] = await Promise.all([
            query.get(),
            db.collection('employees').get()
        ]);

        const employeeMap = {};
        employeesSnap.docs.forEach(doc => { employeeMap[doc.id] = doc.data().employee_name; });

        let allDocs = samplesSnap.docs;

        // Apply Search in memory across all docs
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

        // Apply Pagination manually in memory
        let paginatedDocs = allDocs;
        let hasMore = false;
        if (limitNum > 0) {
            let startIndex = 0;
            if (req.query.startAfter) {
                startIndex = allDocs.findIndex(d => d.id === req.query.startAfter) + 1;
                // If not found, default to 0
                if (startIndex === 0) startIndex = 0; 
            }
            paginatedDocs = allDocs.slice(startIndex, startIndex + limitNum);
            hasMore = startIndex + limitNum < allDocs.length;
        }

        const rows = paginatedDocs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.() || data.created_at,
                current_holder_name: data.current_holder_id ? (employeeMap[data.current_holder_id] || null) : null
            };
        });

        res.json(limitNum > 0 ? { data: rows, hasMore } : rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/samples', async (req, res) => {
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

app.put('/api/samples/:id', async (req, res) => {
    const { sample_name, style_number, developed_for } = req.body;
    try {
        await db.collection('samples').doc(req.params.id).update({
            sample_name, style_number, developed_for: developed_for || ''
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
        const batch = db.batch();
        const results = [];
        samples.forEach(s => {
            const ref = db.collection('samples').doc(); // auto-generate ID
            batch.set(ref, {
                sample_name: s.sample_name || '',
                style_number: s.style_number || '',
                developed_for: s.developed_for || '',
                status: 'In Development',
                current_holder_id: null,
                current_department: '',
                created_at: new Date()
            });
            results.push({ id: ref.id, style_number: s.style_number, sample_name: s.sample_name });
        });
        await batch.commit();
        res.json({ success: true, created: results.length, samples: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// INITIATE TRANSFER (Handover)
// =========================================================
app.post('/api/handover', async (req, res) => {
    const { sample_id, from_employee_id, to_employee_id, department, remarks } = req.body;
    try {
        const txnRef = await db.collection('handovers').add({
            sample_id,
            from_employee_id: from_employee_id || null,
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

        // In-App Notification: notify the receiver
        const [sampleDoc, senderDoc] = await Promise.all([
            db.collection('samples').doc(sample_id).get(),
            from_employee_id ? db.collection('employees').doc(from_employee_id).get() : Promise.resolve(null)
        ]);

        const sample = sampleDoc.data();
        const senderName = senderDoc?.data()?.employee_name || 'Admin';

        await db.collection('notifications').add({
            user_id: to_employee_id,
            title: 'New Transfer Pending',
            message: `${senderName} wants to transfer "${sample.sample_name}" to you.`,
            type: 'handover_pending',
            related_id: txnRef.id,
            read: false,
            created_at: new Date()
        });

        res.json({ success: true, transactionId: txnRef.id, message: 'Transfer initiated. Awaiting receiver acceptance.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// ACCEPT TRANSFER
// =========================================================
app.post('/api/handover/:id/accept', async (req, res) => {
    const transactionId = req.params.id;
    try {
        const txnRef = db.collection('handovers').doc(transactionId);
        const txnDoc = await txnRef.get();

        if (!txnDoc.exists || txnDoc.data().transfer_status !== 'Pending') {
            return res.status(404).json({ error: 'Transaction not found or already processed.' });
        }

        const txn = txnDoc.data();

        // Mark as accepted
        await txnRef.update({ transfer_status: 'Accepted', accepted_at: new Date() });

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

            await db.collection('notifications').add({
                user_id: txn.from_employee_id,
                title: 'Transfer Accepted ✅',
                message: `${receiver?.employee_name || 'Someone'} accepted the transfer of "${sample?.sample_name || 'the sample'}".`,
                type: 'handover_accepted',
                related_id: txn.sample_id,
                read: false,
                created_at: new Date()
            });
        }

        res.json({ success: true, message: 'Transfer accepted. Sample ownership updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// REJECT TRANSFER
// =========================================================
app.post('/api/handover/:id/reject', async (req, res) => {
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
// PENDING TRANSFERS FOR EMPLOYEE
// =========================================================
app.get('/api/pending-transfers/:employeeId', async (req, res) => {
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
app.get('/api/my-samples/:employeeId', async (req, res) => {
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
app.get('/api/samples/:id/history', async (req, res) => {
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
app.post('/api/admin/send-report', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    try {
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

// =========================================================
// NOTIFICATIONS
// =========================================================
app.get('/api/notifications/:employeeId', async (req, res) => {
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

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        await db.collection('notifications').doc(req.params.id).update({ read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all/:employeeId', async (req, res) => {
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
