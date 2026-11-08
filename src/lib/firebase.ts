/**
 * ==============================================================================
 * FIREBASE CLIENT CONFIGURATION (firebase.ts)
 * ==============================================================================
 * This file configures the connection between the Unimart frontend and Google
 * Firebase services.
 *
 * What Firebase provides to Unimart:
 * 1. Authentication (Firebase Auth): Used for student login, email verification,
 *    and social sign-in options.
 * 2. Cloud Services: Real-time database/storage for student uploads.
 *
 * Beginner note:
 * - `firebaseConfig`: Contains public project keys provided by Firebase console.
 *   These identify your app to Google's cloud servers.
 * - `initializeApp(config)`: Boots up the Firebase client SDK.
 * - `getAuth(app)`: Returns the authentication instance used to log users in/out.
 * ==============================================================================
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Public credentials identifying the Unimart project in Google Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDZ85fsuPtlFN6bUgbjvuTiUwxTMS8Z6wE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "unimart-c4308.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "unimart-c4308",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "unimart-c4308.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "911425195338",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:911425195338:web:8e511f03eebe3da6e045b3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0X9K13CQZ3"
};

// Initialize the Firebase App instance
export const app = initializeApp(firebaseConfig);

// Export the Firebase Authentication manager instance for use across the app
export const auth = getAuth(app);
