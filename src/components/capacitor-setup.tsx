
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';

const CapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Initialisation de Capacitor...');

      // Initialise Google Auth
      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      // Masque le Splash Screen manuellement une fois que le JS est chargé
      SplashScreen.hide();
    }
  }, []);

  return null; 
};

export default CapacitorSetup;
