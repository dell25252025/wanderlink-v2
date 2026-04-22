import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Assurer l'initialisation de Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

export const sendNewMessageNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const messageData = snapshot.data();
    const { chatId } = context.params;

    if (!messageData) {
      console.error("Aucune donnée dans le message. Fin de la fonction.");
      return;
    }

    // Récupérer les informations clés du message, y compris le nom de l'expéditeur
    const { senderId, text, senderName } = messageData;

    if (!senderId) {
        console.error("L'ID de l'expéditeur est manquant. Fin de la fonction.");
        return;
    }

    // 1. Obtenir le document du chat pour trouver le destinataire
    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists || !chatDoc.data()?.participants) {
      console.log(`Document du chat ou participants non trouvés pour ${chatId}.`);
      return;
    }
    const participants: string[] = chatDoc.data()!.participants;

    // 2. Déterminer l'ID du destinataire
    const recipientId = participants.find(id => id !== senderId);

    if (!recipientId) {
      console.log("Destinataire non trouvé (l'utilisateur est peut-être seul dans le chat).");
      return;
    }

    // 3. Obtenir les tokens FCM du destinataire
    const userDoc = await db.collection("users").doc(recipientId).get();
    if (!userDoc.exists || !userDoc.data()?.fcmTokens) {
      console.log(`Document ou tokens FCM non trouvés pour l'utilisateur ${recipientId}.`);
      return;
    }
    const tokens: string[] = userDoc.data()!.fcmTokens;

    if (tokens.length === 0) {
      console.log(`Aucun token FCM pour l'utilisateur ${recipientId}.`);
      return;
    }

    // 5. Construire le payload de notification "PRO"
    const payload: admin.messaging.MulticastMessage = {
      tokens: tokens,
      notification: {
        title: senderName || "Nouveau message", // Titre dynamique
        body: text || "Vous a envoyé un message",
      },
      data: {
        type: "MESSAGE", // Pour une gestion future de différents types de notifs
        chatId: chatId,
        senderId: senderId,
        senderName: senderName || "Un utilisateur",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "messages", // Lien vers le canal créé sur Android
          tag: chatId, // Regroupe les notifications du même chat
          visibility: "public",
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true,
          lightSettings: {
            color: "#4A90E2",
            lightOnDurationMillis: 500,
            lightOffDurationMillis: 2000,
          },
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            "content-available": 1, // Pour les mises à jour en arrière-plan sur iOS
          },
        },
      },
    };

    // 6. Envoyer la notification
    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log("Notifications envoyées avec succès:", `${response.successCount} sur ${tokens.length}`);
    } catch (error) {
      console.error("Erreur lors de l'envoi des notifications:", error);
    }
  });
