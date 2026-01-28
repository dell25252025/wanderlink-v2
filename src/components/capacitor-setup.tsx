
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Ce composant gère l'initialisation des plugins Capacitor et l'écoute des événements globaux
const CapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Initialisation non liée à Firebase qui peut être faite immédiatement
      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      SplashScreen.hide();

      // --- DEBUT LOGIQUE D'ECOUTE DES NOTIFICATIONS ---

      // Listener pour l'enregistrement réussi du token. Ceci est passif et ne cause pas de crash.
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log("Push token received: ", token.value);
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          try {
            const db = getFirestore();
            const tokenRef = doc(db, "users", user.uid, "fcmTokens", token.value);
            await setDoc(tokenRef, {
              token: token.value,
              createdAt: new Date(),
              platform: Capacitor.getPlatform()
            });
            console.log("FCM Token saved to Firestore.");
          } catch (error) {
            console.error("Error saving FCM token to Firestore: ", error);
          }
        } else {
          console.log("User not logged in, token not saved.");
        }
      });

      // Listener pour les erreurs d'enregistrement
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error("Error during push notification registration: ", error);
      });
      
      // --- FIN LOGIQUE D'ECOUTE ---
    }
  }, []);

  return null;
};

export default CapacitorSetup;
