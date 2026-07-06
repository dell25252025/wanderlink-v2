import { useEffect } from 'react';
import { User } from 'firebase/auth';
// Étape 2: Import des instances db et rtdb
import { db, rtdb } from '@/lib/firebase';

export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (user) {
      console.log("[DIAGNOSTIC] Le hook est monté pour l'utilisateur:", user.uid);
      
      // Étape 2: Vérifier si les objets db et rtdb sont bien définis.
      console.log("[DIAGNOSTIC] Vérification de l'instance Firestore (db):", db);
      console.log("[DIAGNOSTIC] Vérification de l'instance Realtime Database (rtdb):", rtdb);

    } else {
      console.log("[DIAGNOSTIC] Le hook est monté, mais il n'y a pas d'utilisateur.");
    }
  }, [user]);
};
