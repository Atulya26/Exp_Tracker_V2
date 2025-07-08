// src/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAse2I0D2TlfyXXzhoHTraG5R6QEphllVE",
  authDomain: "spliy-expense-app.firebaseapp.com",
  projectId: "spliy-expense-app",
  storageBucket: "spliy-expense-app.firebasestorage.app",
  messagingSenderId: "530776942195",
  appId: "1:530776942195:web:5838e23c250d5e721e2c06",
  measurementId: "G-9ZCE53653E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
