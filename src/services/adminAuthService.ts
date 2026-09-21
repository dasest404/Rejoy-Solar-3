import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured, getFirebaseErrorMessage } from './firebase';
import { UserRole } from '../types/solar';

export interface ProvisionAccountParams {
  email: string;
  password?: string;
  displayName: string;
  systemRole: UserRole;
  employeeCode: string;
}

export interface ProvisionAccountResult {
  uid: string;
  provider: 'server_admin' | 'client_isolated_firebase' | 'local_offline';
  message: string;
}

/**
 * Provisions a new ERP login account for an employee without disturbing the
 * currently logged-in administrator's active session.
 *
 * Flow:
 * 1. Tries server-side Firebase Admin SDK endpoint (/api/admin/create-employee-account).
 * 2. If server-side Admin SDK is not configured, but Firebase client is configured,
 *    creates an isolated secondary FirebaseApp instance that provisions the user
 *    in Firebase Authentication and immediately signs out and deletes the secondary app.
 *    This completely preserves the active administrator's session.
 * 3. If Firebase is not configured at all, provides an offline development fallback identifier.
 */
export async function provisionEmployeeAccount(
  params: ProvisionAccountParams
): Promise<ProvisionAccountResult> {
  const cleanEmail = params.email.trim();
  const password = params.password;

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // 1. Try server-side endpoint with Firebase Admin SDK
  try {
    const res = await fetch('/api/admin/create-employee-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password,
        displayName: params.displayName.trim(),
        systemRole: params.systemRole,
        employeeCode: params.employeeCode
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.uid) {
        return {
          uid: data.uid,
          provider: 'server_admin',
          message: 'Account provisioned via server-side Firebase Admin SDK.'
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      // If the email is already in use or password invalid, report the exact error
      if (
        errData.code === 'auth/email-already-exists' ||
        errData.code === 'auth/email-already-in-use'
      ) {
        throw new Error('An account with this email address already exists.');
      }
      if (errData.code === 'auth/invalid-password') {
        throw new Error('Password does not meet Firebase requirements.');
      }
      if (res.status === 400 && errData.message) {
        throw new Error(errData.message);
      }
      // If 503 (ADMIN_NOT_CONFIGURED), gracefully proceed to client isolated flow
    }
  } catch (err: any) {
    // Re-throw genuine user input errors
    if (
      err.message &&
      (err.message.includes('already exists') ||
        err.message.includes('Password') ||
        err.message.includes('valid email'))
    ) {
      throw err;
    }
    // Otherwise fallback to client-isolated flow
  }

  // 2. Client-side isolated secondary Firebase App fallback
  if (isFirebaseConfigured()) {
    const tempAppName = `AdminCreateEmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const secondaryApp = initializeApp(firebaseConfig, tempAppName);

    try {
      const secondaryAuth = getAuth(secondaryApp);
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        cleanEmail,
        password
      );

      if (params.displayName) {
        await updateProfile(credential.user, {
          displayName: params.displayName.trim()
        });
      }

      const uid = credential.user.uid;
      await signOut(secondaryAuth);

      return {
        uid,
        provider: 'client_isolated_firebase',
        message: 'Account created in Firebase Auth via isolated session.'
      };
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    } finally {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // App cleanup finished
      }
    }
  }

  // 3. Local offline development fallback
  const offlineUid = `usr-offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    uid: offlineUid,
    provider: 'local_offline',
    message: 'Offline development mode: ERP account linked. Note: Configure Firebase in .env for production password authentication.'
  };
}

/**
 * Updates an employee's credentials or account status.
 */
export async function updateEmployeeAccount(params: {
  uid: string;
  password?: string;
  disabled?: boolean;
}): Promise<boolean> {
  if (!params.password && typeof params.disabled !== 'boolean') {
    return true;
  }

  try {
    const res = await fetch('/api/admin/update-employee-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: params.uid,
        password: params.password,
        disabled: params.disabled
      })
    });

    if (res.ok) {
      const data = await res.json();
      return Boolean(data.success);
    }
  } catch {
    // Endpoint unavailable or failed
  }

  return false;
}

/**
 * Sends a password reset email for an employee using Firebase Auth.
 */
export async function sendEmployeePasswordResetEmail(email: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase Authentication is not configured. Set VITE_FIREBASE_API_KEY in .env.');
  }

  const tempAppName = `AdminReset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, tempAppName);

  try {
    const secondaryAuth = getAuth(secondaryApp);
    await sendPasswordResetEmail(secondaryAuth, email.trim());
  } catch (err: any) {
    throw new Error(getFirebaseErrorMessage(err));
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch {
      // Cleaned
    }
  }
}
