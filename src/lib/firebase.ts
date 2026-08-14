import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from "firebase/auth";
import { initializeFirestore, memoryLocalCache, memoryLruGarbageCollector } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Enforce browser local storage persistence with session/in-memory fallback
setPersistence(auth, browserLocalPersistence)
  .catch(() => setPersistence(auth, browserSessionPersistence))
  .catch(() => setPersistence(auth, inMemoryPersistence))
  .catch(() => {
    // Ignore iframe / tab unloading persistence warning
  });

export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with resilient connection settings (auto long-polling & memory cache)
const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== ""
  ? firebaseConfig.firestoreDatabaseId
  : "(default)";

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    localCache: memoryLocalCache({ garbageCollector: memoryLruGarbageCollector() }),
  },
  databaseId
);

export const storage = getStorage(app);

export const getMessagingInstance = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (err) {
    console.warn("FCM Messaging is not supported in this environment:", err);
  }
  return null;
};

export default app;
