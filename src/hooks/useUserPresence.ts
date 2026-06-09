import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { App } from '@capacitor/app';
import { useAuth } from '@/context/AuthContext';
import { firestore, database } from '@/lib/firebase';

export const useUserPresence = () => {
  const { currentUser: user } = useAuth();

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      return;
    }

    const userDocRef = doc(firestore, 'users', uid);
    const presenceRef = ref(database, `/status/${uid}`);

    const amOnline = {
      isOnline: true,
      lastSeen: serverTimestamp(),
    };

    const amOffline = {
      isOnline: false,
      lastSeen: serverTimestamp(),
    };

    const goOffline = () => {
      updateDoc(userDocRef, amOffline).catch(err => console.error("Error setting offline status:", err));
      set(presenceRef, amOffline).catch(err => console.error("Error setting offline status in RTDB:", err));
    };

    const goOnline = () => {
      updateDoc(userDocRef, amOnline).catch(err => console.error("Error setting online status:", err));
      set(presenceRef, amOnline).catch(err => console.error("Error setting online status in RTDB:", err));
    };


    const connectedRef = ref(database, '.info/connected');
    const listener = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        goOnline();

        // Ceci est correct et gère les déconnexions brutales pour la Realtime Database.
        onDisconnect(presenceRef).set(amOffline);

        // La ligne incorrecte a été supprimée. onDisconnect ne fonctionne pas avec Firestore.
      }
    });

    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) goOnline();
      else goOffline();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') goOnline();
      else goOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', goOffline);

    return () => {
      console.log(`[Presence] Nettoyage pour l'utilisateur ${uid}`);
      
      listener();
      appStateListener.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', goOffline);

      // La déconnexion manuelle est maintenant gérée dans signOutFromGoogle.
      // goOffline() reste ici pour gérer le changement de page ou la fermeture de l'onglet.
      goOffline();
    };

  }, [user]);
};
