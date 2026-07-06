import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, rtdb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (!user) {
      console.log("[DIAGNOSTIC] Test Final: Hook actif, mais pas d'utilisateur connecté.");
      return;
    }

    console.log(`[DIAGNOSTIC] Test Final: Démarrage du hook de présence pour l'utilisateur ${user.uid}.`);

    // Références aux bases de données
    const userDocRef = doc(db, 'users', user.uid);
    const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);

    // Timestamps et statuts pour les deux services
    const isOfflineForFirestore = { isOnline: false, lastSeen: serverTimestamp() };
    const isOnlineForFirestore = { isOnline: true, lastSeen: serverTimestamp() };

    const isOfflineForRTDB = { state: 'offline', last_changed: rtdbServerTimestamp() };
    const isOnlineForRTDB = { state: 'online', last_changed: rtdbServerTimestamp() };

    // 1. Mise à jour de Firestore (déjà validé)
    updateDoc(userDocRef, isOnlineForFirestore);

    // 2. Logique critique de la Realtime Database
    try {
      console.log("[DIAGNOSTIC] Test Final: Tentative de mise en place du onDisconnect.");
      onDisconnect(userStatusDatabaseRef).set(isOfflineForRTDB).then(() => {
        console.log("[DIAGNOSTIC] Test Final: Le gestionnaire onDisconnect a été configuré avec succès.");
        console.log("[DIAGNOSTIC] Test Final: Mise à jour du statut RTDB à 'online'.");
        set(userStatusDatabaseRef, isOnlineForRTDB);
      }).catch((error) => {
        console.error("[DIAGNOSTIC] Test Final: ERREUR lors de la promesse onDisconnect.set() !", error);
      });
    } catch (error) {
      console.error("[DIAGNOSTIC] Test Final: ERREUR dans le bloc try/catch principal de la RTDB !", error);
    }

    // 3. Fonction de nettoyage au démontage (logout)
    return () => {
      console.log(`[DIAGNOSTIC] Test Final: Nettoyage du hook pour ${user.uid}.`);
      // Met à jour le statut immédiatement lors d'une déconnexion propre
      set(userStatusDatabaseRef, isOfflineForRTDB);
      updateDoc(userDocRef, isOfflineForFirestore);
    };

  }, [user]);
};
