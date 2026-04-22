"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

/**
 * Browser-only Firebase singletons.
 *
 * The values in `firebaseConfig` are pulled from `NEXT_PUBLIC_FIREBASE_*`
 * env vars. They are safe to ship in the client bundle — Firebase enforces
 * security via Firestore and Storage rules, not via API-key secrecy.
 *
 * All getters throw if called before the config is populated, so we fail
 * loud at pick-time rather than silently writing to the wrong project.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function assertConfigured(): void {
  const missing = (
    [
      ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
      ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
      ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
      ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
    ] as const
  ).filter(([, v]) => !v);
  if (missing.length > 0) {
    throw new Error(
      `Firebase not configured. Missing env vars: ${missing
        .map(([k]) => k)
        .join(", ")}. Copy .env.example to .env.local and fill them in.`,
    );
  }
}

let appSingleton: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appSingleton) return appSingleton;
  assertConfigured();
  const existing = getApps();
  appSingleton = existing.length > 0 ? existing[0]! : initializeApp(firebaseConfig);
  return appSingleton;
}

let firestoreSingleton: Firestore | null = null;
export function getDb(): Firestore {
  if (firestoreSingleton) return firestoreSingleton;
  firestoreSingleton = getFirestore(getFirebaseApp());
  return firestoreSingleton;
}

let storageSingleton: FirebaseStorage | null = null;
export function getStorageBucket(): FirebaseStorage {
  if (storageSingleton) return storageSingleton;
  storageSingleton = getStorage(getFirebaseApp());
  return storageSingleton;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.appId,
  );
}
