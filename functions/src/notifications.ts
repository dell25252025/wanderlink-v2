
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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

    const { senderId, text, senderName } = messageData;

    if (!senderId) {
        console.error("L'ID de l'expéditeur est manquant. Fin de la fonction.");
        return;
    }

    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists || !chatDoc.data()?.participants) {
      console.log(`Document du chat ou participants non trouvés pour ${chatId}.`);
      return;
    }
    const participants: string[] = chatDoc.data()!.participants;

    const recipientId = participants.find(id => id !== senderId);

    if (!recipientId) {
      console.log("Destinataire non trouvé (l'utilisateur est peut-être seul dans le chat).");
      return;
    }

    // ÉTAPE 2 : Création de la notification dans Firestore
    try {
        await db.collection(`users/${recipientId}/notifications`).add({
            type: "message",
            chatId: chatId,
            senderId: senderId,
            senderName: senderName || "Un utilisateur",
            text: text || "Vous a envoyé un message",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });
        console.log(`Notification pour ${recipientId} créée avec succès.`);
    } catch (error) {
        console.error("Erreur lors de la création de la notification dans Firestore:", error);
    }

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

    const payload: admin.messaging.MulticastMessage = {
      tokens: tokens,
      notification: {
        title: senderName || "Nouveau message",
        body: text || "Vous a envoyé un message",
      },
      data: {
        type: "MESSAGE",
        chatId: chatId,
        senderId: senderId,
        senderName: senderName || "Un utilisateur",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "messages",
          tag: chatId,
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
            "content-available": 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log("Notifications envoyées avec succès:", `${response.successCount} sur ${tokens.length}`);
    } catch (error) {
      console.error("Erreur lors de l'envoi des notifications:", error);
    }
  });
