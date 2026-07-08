
import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, rtdb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

/**
 * Gère la présence de l'utilisateur (en ligne/hors ligne).
 * Ce hook ne lit la préférence de visibilité (`showOnlineStatus`) qu'UNE SEULE fois au démarrage.
 * Il ne crée PAS d'écouteur temps réel sur Firestore pour éviter les boucles.
 *
 * @param user L'objet utilisateur de Firebase Auth.
 */
export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (!user) {
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);

    // Objets de statut pour les mises à jour
    const isOfflineForFirestore = { isOnline: false, lastSeen: serverTimestamp() };
    const isOnlineForFirestore = { isOnline: true, lastSeen: serverTimestamp() };
    const isOfflineForRTDB = { state: 'offline', last_changed: rtdbServerTimestamp() };
    const isOnlineForRTDB = { state: 'online', last_changed: rtdbServerTimestamp() };

    const setupPresence = async () => {
      try {
        // 1. LECTURE UNIQUE des préférences utilisateur
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userWantsToBeVisible = userDoc.data().showOnlineStatus !== false;

          // 2. Si l'utilisateur veut être invisible, on s'assure qu'il est hors ligne et on arrête tout.
          if (!userWantsToBeVisible) {
            // Pas besoin de mettre à jour, car la page de confidentialité l'a déjà fait.
            // On s'assure juste que la RTDB est correcte au cas où.
            set(userStatusDatabaseRef, isOfflineForRTDB);
            return; // Le hook a fini son travail pour cet utilisateur.
          }
        }

        // 3. Si l'utilisateur veut être visible (ou si la préférence n'est pas définie), on établit la présence.
        await set(userStatusDatabaseRef, isOnlineForRTDB);
        await updateDoc(userDocRef, isOnlineForFirestore);

        // 4. On prépare la déconnexion via RTDB
        onDisconnect(userStatusDatabaseRef).set(isOfflineForRTDB);

      } catch (error) {
        console.error("Erreur lors de la mise en place de la présence :", error);
      }
    };

    setupPresence();

    // Fonction de nettoyage exécutée lors de la déconnexion ou du démontage du composant
    return () => {
      if (user) {
        // Quand l'utilisateur se déconnecte, on le passe manuellement hors ligne.
        const userStatusRefOnCleanup = ref(rtdb, `/status/${user.uid}`);
        set(userStatusRefOnCleanup, isOfflineForRTDB);
        updateDoc(doc(db, 'users', user.uid), isOfflineForFirestore);
      }
    };
  }, [user]); // Le hook ne se ré-exécute que si l'objet 'user' change (connexion/déconnexion)
};
