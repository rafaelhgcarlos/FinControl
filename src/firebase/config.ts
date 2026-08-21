import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { connectAuthEmulator } from "firebase/auth";
import { resolveFirebaseConfig } from "./env";

const firebaseConfig = resolveFirebaseConfig({
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);
const usesFirebaseEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
export const firestore: Firestore = usesFirebaseEmulators
  ? getFirestore(firebaseApp)
  : initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
export const offlinePersistenceReady = Promise.resolve(!usesFirebaseEmulators);

if (usesFirebaseEmulators) {
  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
}
