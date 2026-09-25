import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';

/**
 * Firebase Web SDK Configuration
 * Prioritizes firebase-applet-config.json with fallback to environment variables
 */
const runtimeCfg = (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__) || {};

export const firebaseConfig = {
  apiKey: rawFirebaseConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || runtimeCfg.apiKey || '',
  authDomain: rawFirebaseConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || runtimeCfg.authDomain || '',
  projectId: rawFirebaseConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || runtimeCfg.projectId || '',
  storageBucket: rawFirebaseConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || runtimeCfg.storageBucket || '',
  messagingSenderId: rawFirebaseConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || runtimeCfg.messagingSenderId || '',
  appId: rawFirebaseConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || runtimeCfg.appId || '',
  measurementId: rawFirebaseConfig.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || runtimeCfg.measurementId || '',
  firestoreDatabaseId: rawFirebaseConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID || ''
};

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingVariables: string[];
  configuredVariables: string[];
}

export const getFirebaseConfigStatus = (): FirebaseConfigStatus => {
  const envMap: Record<string, string | undefined> = {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  };

  const missingVariables: string[] = [];
  const configuredVariables: string[] = [];

  for (const [key, val] of Object.entries(envMap)) {
    if (!val || val.trim() === '' || val.includes('your-') || val === 'undefined') {
      missingVariables.push(key);
    } else {
      configuredVariables.push(key);
    }
  }

  const hasRequired = configuredVariables.includes('apiKey') && configuredVariables.includes('projectId');

  return {
    isConfigured: hasRequired && missingVariables.length === 0,
    missingVariables,
    configuredVariables
  };
};

export const isFirebaseConfigured = (): boolean => {
  return getFirebaseConfigStatus().isConfigured;
};

// Initialize App
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
/* CRITICAL: The app will break without this line */
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth: Auth = getAuth(app);

// Configure persistent auth
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Could not set browserLocalPersistence:', err);
  });
}

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Standardized Operation Types & Error Reporting
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * User-friendly error message resolver for Firebase Auth error codes
 */
export function getFirebaseErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This user account has been disabled by an administrator.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed attempts. Try again later or reset password.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Authentication popup was closed before completing.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return credential.user;
  } catch (error) {
    throw error;
  }
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  } catch (error) {
    throw error;
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export { app };
