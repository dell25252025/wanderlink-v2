'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';

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

      // Ajout de la demande de permission pour les notifications
      const registerNotifications = async () => {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('User denied permissions for push notifications');
        } else {
          console.log('Push notification permission granted.');
          // On enregistre l'appareil auprès de FCM pour recevoir les notifications
          await PushNotifications.register();
        }
      };

      registerNotifications();
    }
  }, []);

  return null; 
};

export default CapacitorSetup;
