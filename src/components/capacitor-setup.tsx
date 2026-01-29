
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications, Token } from '@capacitor/push-notifications';
// --- MODIFICATION: Imports supplémentaires depuis Firestore ---
import { getFirestore, doc, setDoc, collection, query, getDocs, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Ce composant gère l'initialisation des plugins Capacitor et l'écoute des événements globaux
const CapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      SplashScreen.hide();

      PushNotifications.addListener('registration', async (token: Token) => {
        console.log("Push token received: ", token.value);
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          // --- DEBUT DE LA NOUVELLE LOGIQUE DE NETTOYAGE ---
          try {
            const db = getFirestore();
            const tokensCollectionRef = collection(db, "users", user.uid, "fcmTokens");

            // 1. Préparer un batch d'opérations pour l'efficacité
            const batch = writeBatch(db);

            // 2. Récupérer tous les documents de tokens existants
            const existingTokensSnapshot = await getDocs(query(tokensCollectionRef));

            // 3. Ajouter la suppression de chaque ancien token au batch
            console.log(`Found ${existingTokensSnapshot.size} old tokens to delete.`);
            existingTokensSnapshot.forEach(doc => {
              batch.delete(doc.ref);
            });

            // 4. Ajouter la création du nouveau token au batch
            const newTokenRef = doc(tokensCollectionRef, token.value);
            batch.set(newTokenRef, {
              token: token.value,
              createdAt: new Date(),
              platform: Capacitor.getPlatform()
            });

            // 5. Exécuter toutes les opérations (suppressions + ajout) en une seule fois
            await batch.commit();

            console.log("FCM Token refreshed in Firestore (old tokens deleted, new one added).");

          } catch (error) {
            console.error("Error refreshing FCM token in Firestore: ", error);
          }
          // --- FIN DE LA NOUVELLE LOGIQUE DE NETTOYAGE ---
        } else {
          console.log("User not logged in, token not saved.");
        }
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error("Error during push notification registration: ", error);
      });
    }
  }, []);

  return null;
};

export default CapacitorSetup;
