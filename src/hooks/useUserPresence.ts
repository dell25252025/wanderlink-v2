import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, rtdb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

    updateDoc(userDocRef, isOnlineForFirestore);

    onDisconnect(userStatusDatabaseRef).set(isOfflineForRTDB).then(async () => {
      console.log("--- [TEST FINAL] --- Le .then() de onDisconnect est atteint. Tentative d'écriture dans RTDB.");
      try {
        await set(userStatusDatabaseRef, isOnlineForRTDB);
        console.log("--- [TEST FINAL] --- SUCCÈS : L'écriture dans la Realtime Database a réussi.");
      } catch (error) {
        console.error("--- [TEST FINAL] --- ÉCHEC : L'écriture dans la Realtime Database a échoué. ERREUR :", error);
      }
    }).catch((error) => {
      console.error("--- [TEST FINAL] --- ÉCHEC CRITIQUE : onDisconnect().set() a échoué. ERREUR :", error);
    });

    return () => {
      set(userStatusDatabaseRef, isOfflineForRTDB);
      updateDoc(userDocRef, isOfflineForFirestore);
    };

  }, [user]);
};
