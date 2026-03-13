import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { onMessage, FirestoreOptions } from '@genkit-ai/firebase/firestore';
import * as admin from 'firebase-admin';

// Initialise l'application Firebase Admin (une seule fois)
if (!admin.apps.length) {
  admin.initializeApp();
}

export const ai = genkit({
  plugins: [
    // Configure le plugin Google AI avec la clé API des variables d'environnement.
    // Assurez-vous d'avoir un fichier .env.local avec GEMINI_API_KEY défini.
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // Utilise le modèle Gemini Pro comme demandé.
  model: 'googleai/gemini-pro',
});

// Flow pour envoyer une notification lors de la création d'un nouveau message
export const onMessageCreate = onMessage(
  {
    name: 'onMessageCreate',
    collection: 'chats/{chatId}/messages',
  },
  async (message) => {
    const messageData = message.data();
    if (!messageData) {
      console.log('Aucune donnée de message, sortie.');
      return;
    }

    const fromId = messageData.from;
    const chatId = message.params.chatId;
    const chatDocRef = admin.firestore().collection('chats').doc(chatId);

    try {
      const chatDoc = await chatDocRef.get();
      if (!chatDoc.exists) {
        console.log(`Document de chat ${chatId} non trouvé.`);
        return;
      }

      const chatData = chatDoc.data();
      if (!chatData || !chatData.users) {
        console.log(`Données de chat ou utilisateurs manquants pour ${chatId}.`);
        return;
      }

      const toId = chatData.users.find((id: string) => id !== fromId);
      if (!toId) {
        console.log(`Destinataire non trouvé pour le chat ${chatId}.`);
        return;
      }

      const toUserDoc = await admin.firestore().collection('users').doc(toId).get();
      if (!toUserDoc.exists) {
        console.log(`Utilisateur destinataire ${toId} non trouvé.`);
        return;
      }

      const toUserData = toUserDoc.data();
      const fcmToken = toUserData?.fcmToken;

      if (fcmToken) {
        const fromUserDoc = await admin.firestore().collection('users').doc(fromId).get();
        const fromUserName = fromUserDoc.exists() ? fromUserDoc.data()?.firstName : 'Quelqu\'un';

        const payload = {
          notification: {
            title: `Nouveau message de ${fromUserName}`,
            body: messageData.text || 'Vous avez reçu un nouveau message.',
          },
          token: fcmToken,
        };

        console.log(`Envoi de la notification à ${toId} avec le token ${fcmToken}`);
        await admin.messaging().send(payload);
        console.log('Notification envoyée avec succès.');
      } else {
        console.log(`Aucun token FCM trouvé pour l'utilisateur ${toId}.`);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification :", error);
    }
  }
);
