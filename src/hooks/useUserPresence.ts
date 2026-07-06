import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, rtdb } from '@/lib/firebase'; // Import des deux instances
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
// Étape 5: Import des fonctions de la Realtime Database
import { ref, onDisconnect, set } from 'firebase/database';

export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (user) {
      // --- Partie Firestore (qui fonctionne) ---
      const userDocRef = doc(db, 'users', user.uid);
      updateDoc(userDocRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
      });

      // --- Étape 5: Introduction de la Realtime Database ---
      try {
        // Création de la référence à un chemin dans la RTDB
        const userStatusDatabaseRef = ref(rtdb, '/status/' + user.uid);
        console.log("[DIAGNOSTIC] Étape 5: La création de la référence Realtime Database a réussi.");
      } catch (error) {
        console.error("[DIAGNOSTIC] Étape 5: ERREUR lors de la création de la référence Realtime Database !", error);
      }

    } else {
      console.log("[DIAGNOSTIC] Le hook est monté, mais il n'y a pas d'utilisateur.");
    }

    // Pour l'instant, on ne fait rien à la déconnexion
    return () => {};

  }, [user]);
};
