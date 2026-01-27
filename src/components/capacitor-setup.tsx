
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
      console.log("--- CAPACITOR_SETUP: Composant monte et code actif ---");

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
        console.log("--- LISTENER: Evenement 'registration' entendu! Token: " + token.value);
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
            console.log("--- LISTENER: Token sauvegarde dans Firestore ---");
          } catch (error) {
            console.log("--- LISTENER: Erreur Firestore pendant sauvegarde token ---");
          }
        } else {
          console.log("--- LISTENER: Utilisateur non connecte. Token non sauvegarde. ---");
        }
      });

      // Listener pour les erreurs d'enregistrement
      PushNotifications.addListener('registrationError', (error: any) => {
        console.log("--- LISTENER: ERREUR 'registrationError' entendue! ---", error);
      });
      
      // --- FIN LOGIQUE D'ECOUTE ---
    }
  }, []);

  return null;
};

export default CapacitorSetup;
