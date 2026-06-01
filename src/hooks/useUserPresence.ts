
import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { App } from '@capacitor/app';
import { useAuth } from '@/context/AuthContext';
import { firestore } from '@/lib/firebase';

export const useUserPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('[Presence] Hook initialized'); // AI-ADDED LOG
    const uid = user?.uid;
    if (!uid) return;

    const userDocRef = doc(firestore, 'users', uid);

    const goOnline = async () => {
      try {
        await updateDoc(userDocRef, { online: true, lastSeen: serverTimestamp() });
      } catch (error) {
        console.error("Error going online:", error);
      }
    };

    const goOffline = async () => {
      try {
        await updateDoc(userDocRef, { online: false, lastSeen: serverTimestamp() });
      } catch (error) {
        console.error("Error going offline:", error);
      }
    };

    // Handle app state changes for Capacitor
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        goOnline();
      } else {
        goOffline();
      }
    });

    // Handle web visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        goOnline();
      } else {
        goOffline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set initial status to online
    goOnline();

    // Cleanup listeners on component unmount
    return () => {
      goOffline(); // Set to offline when the hook is cleaned up
      appStateListener.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);
};
