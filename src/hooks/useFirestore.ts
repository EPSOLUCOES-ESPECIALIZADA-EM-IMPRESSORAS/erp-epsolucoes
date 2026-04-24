/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  QueryConstraint,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/components/FirebaseProvider';

export function useFirestoreCollection<T>(collectionName: string, constraints: QueryConstraint[] = [], isPublic = false) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user && !isPublic) return;

    const q = query(collection(db, collectionName), ...constraints);
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as T));
        setData(items);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, collectionName);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, user, ...constraints]);

  return { data, loading, error };
}

export function useFirestoreActions(collectionName: string) {
  const { user } = useAuth();

  const add = async (data: any) => {
    if (!user) throw new Error('User not authenticated');
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        uid: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, collectionName);
    }
  };

  const update = async (id: string, data: any) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  };

  const remove = async (id: string, reason?: string) => {
    try {
      // Log deletion if reason provided
      if (reason) {
        await addDoc(collection(db, 'deletionLogs'), {
          entityType: collectionName.toUpperCase().replace(/S$/, ''),
          entityId: id,
          reason,
          deletedBy: user?.displayName || user?.email || 'Unknown',
          timestamp: Date.now()
        });
      }
      
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  return { add, update, remove };
}
