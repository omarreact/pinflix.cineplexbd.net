import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyB3QkiG9dZIlaSHFCqEnJggLqj33LZGlO8",
  authDomain: "pinflix-by-pincode-it.firebaseapp.com",
  databaseURL: "https://pinflix-by-pincode-it-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pinflix-by-pincode-it",
  storageBucket: "pinflix-by-pincode-it.firebasestorage.app",
  messagingSenderId: "2922341105",
  appId: "1:2922341105:web:2ece0a48155400f6c9ff50",
  measurementId: "G-783QXVX7Y3",
};

const publicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? fallbackFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? fallbackFirebaseConfig.appId,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? fallbackFirebaseConfig.databaseURL,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? fallbackFirebaseConfig.measurementId,
};

const explicitConfig = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
].every(Boolean);

export const firebaseConfigured = explicitConfig || Boolean(publicConfig.apiKey && publicConfig.authDomain && publicConfig.projectId && publicConfig.storageBucket && publicConfig.messagingSenderId && publicConfig.appId);

if (process.env.NODE_ENV === "development" && !explicitConfig) {
  console.warn("Firebase environment variables are missing. Pinflix will run in demo mode until NEXT_PUBLIC_FIREBASE_* values are configured.");
}

const app =
  getApps().find((existingApp) => existingApp.name === "pinflix") ??
  initializeApp(publicConfig, "pinflix");

export function getFirebaseAuth() {
  return getAuth(app);
}

export function getFirebaseFirestore() {
  return getFirestore(app, "pinflix");
}
