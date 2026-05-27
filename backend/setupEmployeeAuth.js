/**
 * ONE-TIME SETUP SCRIPT
 * Creates Firebase Auth accounts for all existing employees in Firestore.
 * Skips employees that already have an email set (e.g., Abhinav / Admin).
 * Run once with: node setupEmployeeAuth.js
 */

const { db, admin } = require('./firebase');

// Generated login credentials for each employee
// Format: firstname@garmenttrack.in / default password
const EMPLOYEE_ACCOUNTS = [
    { name: 'Pranali',  email: 'pranali.prod@garmenttrack.in',    password: 'Pranali@2024' },
    { name: 'Aniket',   email: 'aniket.qa@garmenttrack.in',       password: 'Aniket@2024'  },
    { name: 'Deepak',   email: 'deepak.dispatch@garmenttrack.in', password: 'Deepak@2024'  },
    { name: 'Sneha',    email: 'sneha.design@garmenttrack.in',    password: 'Sneha@2024'   },
    { name: 'Rahul',    email: 'rahul.sampling@garmenttrack.in',  password: 'Rahul@2024'   },
    { name: 'Priya',    email: 'priya.merch@garmenttrack.in',     password: 'Priya@2024'   },
    { name: 'Vikram',   email: 'vikram.floor@garmenttrack.in',    password: 'Vikram@2024'  },
    { name: 'Neha',     email: 'neha.qa@garmenttrack.in',         password: 'Neha@2024'    },
    { name: 'Amit',     email: 'amit.warehouse@garmenttrack.in',  password: 'Amit@2024'    },
];

async function setupEmployeeAuth() {
    console.log('🚀 Starting Employee Firebase Auth Setup...\n');

    const snapshot = await db.collection('employees').get();
    const employees = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));

    for (const account of EMPLOYEE_ACCOUNTS) {
        // Find matching employee document in Firestore (case-insensitive)
        const match = employees.find(e =>
            e.employee_name.toLowerCase() === account.name.toLowerCase()
        );

        if (!match) {
            console.log(`  ⚠️  No Firestore document found for: ${account.name} — skipping.`);
            continue;
        }

        // Skip if already has an email
        if (match.email) {
            console.log(`  ✅ ${account.name} already has email (${match.email}) — skipping.`);
            continue;
        }

        try {
            // 1. Create Firebase Auth account
            const authUser = await admin.auth().createUser({
                email: account.email,
                password: account.password,
                displayName: account.name,
            });

            // 2. Update Firestore document with email and Firebase UID
            await db.collection('employees').doc(match.firestoreId).update({
                email: account.email,
                uid: authUser.uid,
            });

            console.log(`  ✅ Created: ${account.name}`);
            console.log(`     Email:    ${account.email}`);
            console.log(`     Password: ${account.password}`);
            console.log(`     UID:      ${authUser.uid}\n`);

        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                console.log(`  ⚠️  ${account.name}: Auth account already exists for ${account.email} — updating Firestore only.`);
                const existingUser = await admin.auth().getUserByEmail(account.email);
                await db.collection('employees').doc(match.firestoreId).update({
                    email: account.email,
                    uid: existingUser.uid,
                });
            } else {
                console.error(`  ❌ Failed for ${account.name}:`, err.message);
            }
        }
    }

    console.log('\n🎉 Done! All employee Firebase accounts are set up.');
    console.log('📋 Share the credentials above with each employee so they can log in.');
    process.exit(0);
}

setupEmployeeAuth().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
