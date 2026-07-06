import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
// Étape 4: Import de doc, updateDoc, et serverTimestamp
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (user) {
      console.log("[DIAGNOSTIC] Étape 4: Le hook est monté pour l'utilisateur:", user.uid);
      const userDocRef = doc(db, 'users', user.uid);

      // Étape 4: Tentative d'écriture sur Firestore
      updateDoc(userDocRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
      })
      .then(() => {
        console.log("[DIAGNOSTIC] Étape 4: La mise à jour du statut 'isOnline: true' sur Firestore a réussi.");
      })
      .catch((error) => {
        console.error("[DIAGNOSTIC] Étape 4: ERREUR lors de la mise à jour du statut sur Firestore !", error);
      });

    } else {
      console.log("[DIAGNOSTIC] Le hook est monté, mais il n'y a pas d'utilisateur.");
    }
  }, [user]);
};
