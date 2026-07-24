import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDZ85fsuPtlFN6bUgbjvuTiUwxTMS8Z6wE",
  authDomain: "unimart-c4308.firebaseapp.com",
  projectId: "unimart-c4308",
  storageBucket: "unimart-c4308.firebasestorage.app",
  messagingSenderId: "911425195338",
  appId: "1:911425195338:web:8e511f03eebe3da6e045b3",
  measurementId: "G-0X9K13CQZ3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
