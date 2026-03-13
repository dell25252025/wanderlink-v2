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
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
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

      // **LA CORRECTION EST ICI**
      // 1. Lire les tokens depuis la sous-collection `fcmTokens`
      const tokensSnapshot = await admin.firestore().collection(`users/${toId}/fcmTokens`).get();

      if (tokensSnapshot.empty) {
        console.log(`Aucun token FCM trouvé pour l'utilisateur ${toId}.`);
        return;
      }

      const tokens = tokensSnapshot.docs.map(doc => doc.id);

      if (tokens.length > 0) {
        const fromUserDoc = await admin.firestore().collection('users').doc(fromId).get();
        const fromUserName = fromUserDoc.exists() ? fromUserDoc.data()?.firstName : 'Quelqu\'un';

        // 2. Construire la notification avec les données pour la navigation
        const payload = {
          notification: {
            title: `Nouveau message de ${fromUserName}`,
            body: messageData.text || 'Vous avez reçu un nouveau message.',
          },
          data: {
            chatId: chatId, // Permet à l'app de savoir quel chat ouvrir
          },
        };

        // 3. Envoyer à tous les appareils de l'utilisateur
        console.log(`Envoi de la notification à ${toId} pour ${tokens.length} appareil(s).`);
        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log('Réponse de l'envoi de notification:', response);

        // 4. (Optionnel) Nettoyer les tokens invalides
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('Échec de l\'envoi au token', tokens[index], error);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              admin.firestore().collection(`users/${toId}/fcmTokens`).doc(tokens[index]).delete();
            }
          }
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification :", error);
    }
  }
);
