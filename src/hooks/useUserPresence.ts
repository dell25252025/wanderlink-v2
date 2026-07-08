
import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, rtdb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { ref, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (!user) {
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);

    const isOfflineForFirestore = { isOnline: false, lastSeen: serverTimestamp() };
    const isOnlineForFirestore = { isOnline: true, lastSeen: serverTimestamp() };

    const isOfflineForRTDB = { state: 'offline', last_changed: rtdbServerTimestamp() };
    const isOnlineForRTDB = { state: 'online', last_changed: rtdbServerTimestamp() };

    // On établit un listener pour connaître la préférence de l'utilisateur en temps réel
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const userData = snapshot.data();
      const userWantsToBeVisible = userData.showOnlineStatus !== false;

      // Si l'utilisateur NE VEUT PAS être visible, on s'assure qu'il soit hors ligne et on arrête tout.
      if (!userWantsToBeVisible) {
        set(userStatusDatabaseRef, isOfflineForRTDB);
        updateDoc(userDocRef, isOfflineForFirestore);
        return;
      }
      
      // Si l'utilisateur VEUT être visible, on applique la logique de présence normale.
      updateDoc(userDocRef, isOnlineForFirestore);
      set(userStatusDatabaseRef, isOnlineForRTDB);

      onDisconnect(userStatusDatabaseRef).set(isOfflineForRTDB);
    });

    // La fonction de nettoyage doit tout couper
    return () => {
      unsubscribe(); // Arrête d'écouter les préférences
      if (user) {
        // On s'assure de mettre l'utilisateur hors ligne quand il se déconnecte volontairement
        const userStatusDatabaseRefOnCleanup = ref(rtdb, `/status/${user.uid}`);
        set(userStatusDatabaseRefOnCleanup, isOfflineForRTDB);
        updateDoc(doc(db, 'users', user.uid), isOfflineForFirestore);
      }
    };

  }, [user]);
};
