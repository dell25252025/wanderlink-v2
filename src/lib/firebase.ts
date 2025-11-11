// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGC-3H86sqqgigM2H5bIE4e1bEmGnKJz0",
  authDomain: "wanderlink-c1a35.firebaseapp.com",
  projectId: "wanderlink-c1a35",
  storageBucket: "wanderlink-c1a35.firebasestorage.app",
  messagingSenderId: "186522309970",
  appId: "1:186522309970:web:85d430fa8caa742a1b968b",
  measurementId: "G-BSPSX9RKVL"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);


export { app, db, auth, storage, functions };
