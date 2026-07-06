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

    // Mise à jour de la présence sur Firestore et RTDB
    updateDoc(userDocRef, isOnlineForFirestore);
    
    // Logique de déconnexion de la Realtime Database
    onDisconnect(userStatusDatabaseRef).set(isOfflineForRTDB).then(() => {
      set(userStatusDatabaseRef, isOnlineForRTDB);
    });

    return () => {
      // Nettoyage lors de la déconnexion ou du démontage
      set(userStatusDatabaseRef, isOfflineForRTDB);
      updateDoc(userDocRef, isOfflineForFirestore);
    };

  }, [user]);
};
