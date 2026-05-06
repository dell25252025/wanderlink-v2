
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

    // On ne récupère plus senderName, on va le chercher nous-mêmes
    const { senderId, text } = messageData;

    if (!senderId) {
        console.error("L'ID de l'expéditeur est manquant. Fin de la fonction.");
        return;
    }

    // NOUVELLE LOGIQUE : Récupérer le nom de l'expéditeur depuis son profil
    let senderName = "Un utilisateur"; // Nom par défaut
    try {
        const senderDoc = await db.collection("users").doc(senderId).get();
        if (senderDoc.exists) {
            senderName = senderDoc.data()?.displayName || senderName;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération du profil de l'expéditeur:", error);
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

    // Création de la notification dans Firestore pour la cloche
    try {
        await db.collection(`users/${recipientId}/notifications`).add({
            type: "message",
            chatId: chatId,
            senderId: senderId,
            senderName: senderName, // On utilise le nom récupéré
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
        title: senderName, // On utilise le nom récupéré
        body: text || "Vous a envoyé un message",
      },
      data: {
        type: "MESSAGE",
        chatId: chatId,
      },
      android: {
        priority: "high",
        notification: {
          title: senderName, // On utilise le nom récupéré
          body: text || "Vous a envoyé un message",
          channelId: "messages",
          tag: chatId,
          visibility: "public",
          sound: "default",
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
      await admin.messaging().sendEachForMulticast(payload);
      console.log("Notifications envoyées avec succès.");
    } catch (error) {
      console.error("Erreur lors de l'envoi des notifications:", error);
    }
  });

