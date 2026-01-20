'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { updateUserPresence } from '@/lib/firebase-actions';

const CapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Initialisation de Capacitor...');

      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      SplashScreen.hide();
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        updateUserPresence(user.uid, true);

        App.addListener('appStateChange', ({ isActive }) => {
          updateUserPresence(user.uid, isActive);
        });

        if (!Capacitor.isNativePlatform()) {
          const handleVisibilityChange = () => {
            updateUserPresence(user.uid, document.visibilityState === 'visible');
          };
          const handleBeforeUnload = () => {
            updateUserPresence(user.uid, false);
          };

          window.addEventListener('visibilitychange', handleVisibilityChange);
          window.addEventListener('beforeunload', handleBeforeUnload);

          return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
          };
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return null; 
};

export default CapacitorSetup;
