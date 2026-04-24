/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getStorage, ref, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

import aiStudioFirebaseConfig from '../../firebase-applet-config.json';

type AppFirebaseConfig = FirebaseOptions & {
  firestoreDatabaseId?: string;
};

const envFirebaseConfig: AppFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
};

const hasProductionFirebaseConfig = [
  envFirebaseConfig.apiKey,
  envFirebaseConfig.authDomain,
  envFirebaseConfig.projectId,
  envFirebaseConfig.storageBucket,
  envFirebaseConfig.messagingSenderId,
  envFirebaseConfig.appId,
].every(Boolean);

const firebaseConfig: AppFirebaseConfig = hasProductionFirebaseConfig
  ? envFirebaseConfig
  : aiStudioFirebaseConfig;

if (!hasProductionFirebaseConfig) {
  console.warn(
    'Firebase production environment variables were not found. Using the bundled AI Studio Firebase config as a local fallback.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

let storageInstance: any = null;
export function getStorageInstance() {
  if (!storageInstance) {
    try {
      storageInstance = getStorage(app);
      // Set very generous timeouts to prevent "retry-limit-exceeded" on slow connections
      // Values are in milliseconds
      storageInstance.maxUploadRetryTime = 60000; // 60 seconds per upload retry
      storageInstance.maxOperationRetryTime = 600000; // 10 minutes total for operation (safe for 10MB even on 128kbps)
    } catch (error) {
      console.warn('Firebase Storage not initialized. Please enable it in the Firebase Console.', error);
      return null;
    }
  }
  return storageInstance;
}

// Auth Helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Firestore Error Handler
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function uploadFile(path: string, file: File, onProgress?: (progress: number) => void) {
  const store = getStorageInstance();
  if (!store) throw new Error('O serviço de armazenamento (Firebase Storage) não está disponível. Por favor, verifique se ele foi ativado no console do Firebase.');
  
  const fileRef = ref(store, path);
  
  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
        console.log('Upload is ' + progress + '% done');
      }, 
      (error) => {
        // Handle unsuccessful uploads
        console.error('Upload error:', error);
        reject(error);
      }, 
      () => {
        // Handle successful uploads on complete
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
}

export async function deleteFile(path: string) {
  const store = getStorageInstance();
  if (!store) return;
  
  const fileRef = ref(store, path);
  await deleteObject(fileRef);
}

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
