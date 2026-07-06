import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
// Étape 3: Import de la fonction 'doc'
import { doc } from 'firebase/firestore';

export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (user) {
      console.log("[DIAGNOSTIC] Étape 3: Le hook est monté pour l'utilisateur:", user.uid);
      
      try {
        // Étape 3: Création de la référence au document. C'est la première ligne critique.
        const userDocRef = doc(db, 'users', user.uid);
        console.log("[DIAGNOSTIC] Étape 3: La création de la référence au document a réussi. userDocRef:", userDocRef);
      } catch (error) {
        console.error("[DIAGNOSTIC] Étape 3: ERREUR lors de la création de la référence au document !", error);
      }

    } else {
      console.log("[DIAGNOSTIC] Le hook est monté, mais il n'y a pas d'utilisateur.");
    }
  }, [user]);
};
