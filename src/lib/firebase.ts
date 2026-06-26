/**
 * Firebase initialization — guarded.
 *
 * Reads config from VITE_FIREBASE_* env vars (see .env.example). If the API key
 * is missing, `firebaseEnabled` is false and the app runs in standalone mode
 * (localStorage, no sign-in). Once the env keys are present, auth/db/storage
 * come online and cloud sync + login activate. Nothing here throws when unset.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

if (firebaseEnabled) {
  app = initializeApp(config)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
} else if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('[firebase] No VITE_FIREBASE_* config found — running standalone (localStorage, no sign-in).')
}

export { app, auth, db, storage }
