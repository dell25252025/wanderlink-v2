
import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { App } from '@capacitor/app';
import { useAuth } from '@/context/AuthContext';
import { firestore, database } from '@/lib/firebase';

export const useUserPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    const userDocRef = doc(firestore, 'users', uid);
    const presenceRef = ref(database, `/status/${uid}`);

    // --- Realtime Database connection status --- //
    const amOnline = {
      online: true,
      lastSeen: serverTimestamp(),
    };

    const amOffline = {
      online: false,
      lastSeen: serverTimestamp(),
    };

    const connectedRef = ref(database, '.info/connected');

    const listener = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // We're connected (or reconnected).
        // Update our presence status in Firestore.
        updateDoc(userDocRef, amOnline).catch(err => console.error("Error setting online status in Firestore:", err));

        // When I disconnect, update my status in Firestore to offline.
        // This is the magic part that handles abrupt disconnects.
        const onDisconnectRef = onDisconnect(presenceRef);
        onDisconnectRef.set(amOffline)
          .then(() => {
            // Also, update Firestore when the onDisconnect is set.
            const firestoreOnDisconnectRef = onDisconnect(userDocRef);
            firestoreOnDisconnectRef.update(amOffline);
          })
          .catch(err => console.error("Error setting onDisconnect hook:", err));

        // Finally, set my current status in the Realtime Database.
        set(presenceRef, amOnline).catch(err => console.error("Error setting online status in RTDB:", err));
      }
    });

    // --- App and browser lifecycle events --- //
    const goOffline = () => {
      updateDoc(userDocRef, amOffline).catch(err => console.error("Error setting offline status:", err));
      set(presenceRef, amOffline).catch(err => console.error("Error setting offline status in RTDB:", err));
    };

    const goOnline = () => {
      updateDoc(userDocRef, amOnline).catch(err => console.error("Error setting online status:", err));
      set(presenceRef, amOnline).catch(err => console.error("Error setting online status in RTDB:", err));
    };

    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) goOnline();
      else goOffline();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') goOnline();
      else goOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', goOffline); // For browser tab closes

    // Cleanup function on unmount
    return () => {
      listener(); // Detach the .info/connected listener
      appStateListener.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', goOffline);
      goOffline(); // Explicitly go offline on cleanup
    };

  }, [user]);
};
