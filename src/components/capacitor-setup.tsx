
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const CapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log("Initialisation de Capacitor...");

      // Initialise Google Auth
      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      // Masque le Splash Screen
      SplashScreen.hide();

      // --- DEBUT LOGIQUE DE NOTIFICATION ---

      // Fonction pour demander la permission et s'enregistrer
      const registerPush = async () => {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log("Permission de notification non accordee");
          return;
        }

        await PushNotifications.register();
      };

      // Execution de la logique de notification
      registerPush();

      // Listener pour l'enregistrement réussi du token
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log("FCM token recu");
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
            console.log("Token sauvegarde dans Firestore");
          } catch (error) {
            console.log("Erreur Firestore pendant sauvegarde token");
          }
        } else {
          console.log("Utilisateur non connecte. Token non sauvegarde.");
        }
      });

      // Listener pour les erreurs d'enregistrement
      PushNotifications.addListener('registrationError', (error: any) => {
        console.log("Erreur enregistrement notification");
      });
      
      // --- FIN LOGIQUE DE NOTIFICATION ---
    }
  }, []);

  return null;
};

export default CapacitorSetup;
