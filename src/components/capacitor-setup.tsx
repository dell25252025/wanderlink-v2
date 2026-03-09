'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications, Channel } from '@capacitor/push-notifications';

const CapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Initialisation de Google Auth
      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      // Masquer le splash screen
      SplashScreen.hide();

      // --- NOUVEAU: Création du canal de notification au démarrage ---
      const createNotificationChannel = async () => {
        try {
          const channel: Channel = {
            id: "messages",
            name: "Messages",
            description: "Notifications for new messages",
            importance: 5, // Importance maximale
            visibility: 1, // Visible publiquement
            sound: "default",
            vibration: true,
          };
          await PushNotifications.createChannel(channel);
          console.log('Notification channel "messages" created successfully at startup.');
        } catch (e) {
          console.error('Error creating notification channel at startup:', e);
        }
      };

      createNotificationChannel();
      // -------------------------------------------------------------
    }
  }, []);

  return null;
};

export default CapacitorSetup;
