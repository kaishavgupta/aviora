/**
 * Seeding Script for Aviora Firestore Database
 * 
 * This script populates the Cloud Firestore database with sample seed data:
 * - 5 staff members (with associated user profiles for security rules verification).
 * - 3 passenger requests at different milestones in the workflow.
 * 
 * Prerequisites:
 * Ensure you have initialized firebase and installed the client SDK:
 * npm install firebase
 * 
 * Execution Instructions:
 * 1. Copy your actual web app credentials from the Firebase Console.
 * 2. Paste them into the `firebaseConfig` object placeholder below.
 * 3. Run the script from the terminal inside the root workspace folder:
 *    node scripts/seedFirestore.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

// =========================================================================
// REPLACE WITH YOUR FIREBASE CONFIGURATION METADATA
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAPd6FB3N1oXa4W0ypynMObNhDSUjRRTUc",
  authDomain: "mobile-app-intern.firebaseapp.com",
  projectId: "mobile-app-intern",
  storageBucket: "mobile-app-intern.firebasestorage.app",
  messagingSenderId: "661987865346",
  appId: "1:661987865346:web:28d0f82453a4b8f906081b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data Definitions
const staffMembers = [
  { uid: "staff_rajan", name: "Rajan Mehta", mobile: "+919876543210", email: "rajan.mehta@aviora.com", available: true },
  { uid: "staff_priya", name: "Priya Sharma", mobile: "+919876543211", email: "priya.sharma@aviora.com", available: true },
  { uid: "staff_deepak", name: "Deepak Nair", mobile: "+919876543212", email: "deepak.nair@aviora.com", available: false },
  { uid: "staff_anita", name: "Anita Patel", mobile: "+919876543213", email: "anita.patel@aviora.com", available: true },
  { uid: "staff_suresh", name: "Suresh Kumar", mobile: "+919876543214", email: "suresh.kumar@aviora.com", available: false }
];

const passengers = [
  { uid: "passenger_amit", name: "Amit Patel", mobile: "+919988776655", email: "amit.patel@gmail.com", role: "passenger" },
  { uid: "passenger_kiran", name: "Kiran Rao", mobile: "+919988776656", email: "kiran.rao@gmail.com", role: "passenger" },
  { uid: "passenger_devi", name: "Devi Nair", mobile: "+919988776657", email: "devi.nair@gmail.com", role: "passenger" }
];

// Helper to project future dates
const getFutureDate = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return Timestamp.fromDate(date);
};

const requests = [
  // 1. Request: status "New Request"
  {
    requestId: "req_bom_001",
    userId: "passenger_amit",
    passengerName: "Amit Patel",
    passengerMobile: "+919988776655",
    passengerEmail: "amit.patel@gmail.com",
    airportName: "Chhatrapati Shivaji Maharaj International (BOM)",
    flightNumber: "AI-101",
    pnr: "AMIT12",
    flightType: "DEPARTURE",
    assistanceType: "Wheelchair Assistance (Ramp)",
    specialRequirements: "Passenger requires assistance boarding the aircraft cabin ramp.",
    status: "New Request",
    statusHistory: [
      {
        status: "New Request",
        note: "Assistance request submitted by passenger.",
        updatedBy: "Amit Patel",
        timestamp: Timestamp.now()
      }
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    assignedStaff: null,
    documentUrls: []
  },
  // 2. Request: status "Staff Assigned"
  {
    requestId: "req_del_002",
    userId: "passenger_kiran",
    passengerName: "Kiran Rao",
    passengerMobile: "+919988776656",
    passengerEmail: "kiran.rao@gmail.com",
    airportName: "Indira Gandhi International (DEL)",
    flightNumber: "6E-502",
    pnr: "KIRAN3",
    flightType: "DEPARTURE",
    assistanceType: "Visual Assistance",
    specialRequirements: "Visually impaired traveler requesting boarding escort service.",
    status: "Staff Assigned",
    statusHistory: [
      {
        status: "New Request",
        note: "Assistance request submitted by passenger.",
        updatedBy: "Kiran Rao",
        timestamp: getFutureDate(-2)
      },
      {
        status: "Under Review",
        note: "Documents and PNR verified by operations.",
        updatedBy: "Priya Sharma",
        timestamp: getFutureDate(-1)
      },
      {
        status: "Staff Assigned",
        note: "Staff member Rajan Mehta assigned to assist.",
        updatedBy: "Priya Sharma",
        timestamp: Timestamp.now()
      }
    ],
    createdAt: getFutureDate(-2),
    updatedAt: Timestamp.now(),
    assignedStaff: {
      uid: "staff_rajan",
      name: "Rajan Mehta",
      mobile: "+919876543210",
      staffId: "staff_rajan",
      staffName: "Rajan Mehta",
      staffMobile: "+919876543210"
    },
    documentUrls: []
  },
  // 3. Request: status "Assistance In Progress"
  {
    requestId: "req_blr_003",
    userId: "passenger_devi",
    passengerName: "Devi Nair",
    passengerMobile: "+919988776657",
    passengerEmail: "devi.nair@gmail.com",
    airportName: "Kempegowda International (BLR)",
    flightNumber: "UK-808",
    pnr: "DEVIN9",
    flightType: "DEPARTURE",
    assistanceType: "Deaf/Hard of Hearing Assistance",
    specialRequirements: "Passenger requires gate transit navigation and visual boardings updates.",
    status: "Assistance In Progress",
    statusHistory: [
      {
        status: "New Request",
        note: "Assistance request submitted by passenger.",
        updatedBy: "Devi Nair",
        timestamp: getFutureDate(-3)
      },
      {
        status: "Under Review",
        note: "Request reviewed and approved for boarding team allocations.",
        updatedBy: "Rajan Mehta",
        timestamp: getFutureDate(-2)
      },
      {
        status: "Staff Assigned",
        note: "Staff member Priya Sharma assigned to assist.",
        updatedBy: "Rajan Mehta",
        timestamp: getFutureDate(-1)
      },
      {
        status: "Passenger Contacted",
        note: "Contacted passenger at check-in counter counter 4.",
        updatedBy: "Priya Sharma",
        timestamp: getFutureDate(-0.5)
      },
      {
        status: "Assistance In Progress",
        note: "Wheelchair assist started. Escorting passenger to security gates.",
        updatedBy: "Priya Sharma",
        timestamp: Timestamp.now()
      }
    ],
    createdAt: getFutureDate(-3),
    updatedAt: Timestamp.now(),
    assignedStaff: {
      uid: "staff_priya",
      name: "Priya Sharma",
      mobile: "+919876543211",
      staffId: "staff_priya",
      staffName: "Priya Sharma",
      staffMobile: "+919876543211"
    },
    documentUrls: []
  }
];

// Seeding orchestrator
const seed = async () => {
  console.log('Starting Cloud Firestore database seeding for Aviora...');
  
  if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
    console.error('ERROR: Please replace the firebaseConfig placeholders with your actual credentials before running!');
    process.exit(1);
  }

  try {
    // 1. Seed Staff Profiles
    console.log('\nSeeding Support Staff accounts...');
    for (const staff of staffMembers) {
      // Seed /staff/{uid}
      await setDoc(doc(db, 'staff', staff.uid), {
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        available: staff.available
      });
      // Seed /users/{uid} matching staff profile for rules validation
      await setDoc(doc(db, 'users', staff.uid), {
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        role: "staff"
      });
      console.log(`- Seeded Staff: ${staff.name} (ID: ${staff.uid})`);
    }

    // 2. Seed Passenger User Profiles
    console.log('\nSeeding Passenger accounts...');
    for (const pax of passengers) {
      await setDoc(doc(db, 'users', pax.uid), {
        name: pax.name,
        email: pax.email,
        mobile: pax.mobile,
        role: pax.role
      });
      console.log(`- Seeded Passenger Profile: ${pax.name} (ID: ${pax.uid})`);
    }

    // 3. Seed Requests
    console.log('\nSeeding Assistance Requests...');
    for (const req of requests) {
      await setDoc(doc(db, 'requests', req.requestId), req);
      console.log(`- Seeded Request: ${req.passengerName} -> ${req.status} (ID: ${req.requestId})`);
    }

    console.log('\nDatabase seeding completed successfully! All records created.');
    process.exit(0);
  } catch (error) {
    console.error('\nFatal error seeding database:', error);
    process.exit(1);
  }
};

// Run Seeding
seed();
