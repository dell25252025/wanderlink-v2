
import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { App } from '@capacitor/app';
import { useAuth } from '@/context/AuthContext';
import { firestore } from '@/lib/firebase';

export const useUserPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('[Presence] Hook initialized'); 
    const uid = user?.uid;
    if (!uid) return;

    console.log(`[Presence] Hook running for user: ${uid}`);

    const userDocRef = doc(firestore, 'users', uid);

    const goOnline = async () => {
      console.log(`[Presence] Setting user ${uid} to ONLINE.`);
      try {
        await updateDoc(userDocRef, { online: true, lastSeen: serverTimestamp() });
      } catch (error) {
        console.error(`[Presence] Error going online for user ${uid}:`, error);
      }
    };

    const goOffline = async () => {
      console.log(`[Presence] Setting user ${uid} to OFFLINE.`);
      try {
        await updateDoc(userDocRef, { online: false, lastSeen: serverTimestamp() });
      } catch (error) {
        console.error(`[Presence] Error going offline for user ${uid}:`, error);
      }
    };

    // Handle app state changes for Capacitor
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      console.log(`[Presence] App state changed. isActive: ${isActive}`);
      if (isActive) {
        goOnline();
      } else {
        goOffline();
      }
    });

    // Handle web visibility changes
    const handleVisibilityChange = () => {
      console.log(`[Presence] Visibility state changed. State: ${document.visibilityState}`);
      if (document.visibilityState === 'visible') {
        goOnline();
      } else {
        goOffline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set initial status to online
    console.log("[Presence] Setting initial status to online.");
    goOnline();

    // Cleanup listeners on component unmount
    return () => {
      console.log(`[Presence] Cleanup for user: ${uid}. Setting to offline.`);
      goOffline(); // Set to offline when the hook is cleaned up
      appStateListener.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);
};
