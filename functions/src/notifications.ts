
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const db = admin.firestore();
const fcm = admin.messaging();

/**
 * Récupère les tokens FCM d'un utilisateur depuis Firestore.
 * @param userId L'ID de l'utilisateur.
 * @returns Une liste de tokens FCM.
 */
async function getRecipientTokens(userId: string): Promise<string[]> {
  const tokensRef = db.collection("users").doc(userId).collection("fcmTokens");
  const tokensSnapshot = await tokensRef.get();

  if (tokensSnapshot.empty) {
    console.log(`No FCM tokens found for recipient: ${userId}`);
    return [];
  }

  const tokens = tokensSnapshot.docs.map((doc) => doc.id);
  console.log(`Found tokens for ${userId}: ${tokens.join(", ")}`);
  return tokens;
}

/**
 * Envoie une notification FCM à une liste de tokens et gère les tokens invalides.
 * @param tokens La liste des tokens destinataires.
 * @param payload La charge utile de la notification.
 */
async function sendFcmNotification(tokens: string[], payload: {[key: string]: any}): Promise<void> {
  if (tokens.length === 0) {
      console.log("Token list is empty, skipping FCM send.");
      return;
  }
  
  const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: payload.notification,
      android: payload.android,
      data: payload.data,
  };

  console.log("Sending multicast message:", JSON.stringify(message, null, 2));
  const response = await fcm.sendEachForMulticast(message);
  console.log(`${response.successCount} messages were sent successfully`);

  if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        console.error(`Failed to send notification to token: ${tokens[idx]}`, resp.error);
        if (
          resp.error.code === "messaging/invalid-registration-token" ||
          resp.error.code === "messaging/registration-token-not-registered"
        ) {
          console.log(`Token ${tokens[idx]} is invalid and should be removed.`);
        }
      }
    });
  }
}

// --- Trigger Firestore pour les nouveaux messages ---
export const onNewMessage = functions.firestore
  .document("groupChats/{chatId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const messageData = snapshot.data();
    const chatId = context.params.chatId;

    if (!messageData) {
      console.log("No data in the new message.");
      return;
    }

    const senderId = messageData.senderId;
    console.log(`New message from ${senderId} in chat ${chatId}.`);

    const chatRef = db.collection("groupChats").doc(chatId);
    const chatDoc = await chatRef.get();
    const chatData = chatDoc.data();

    if (!chatData || !chatData.participants) {
      console.log("Chat data or participants not found.");
      return;
    }

    const recipientIds = chatData.participants.filter((p: string) => p !== senderId);
    if (recipientIds.length === 0) {
      console.log("No recipients to notify.");
      return;
    }
    console.log(`Recipients identified: ${recipientIds.join(', ')}.`);

    const senderDoc = await db.collection("users").doc(senderId).get();
    const senderName = senderDoc.data()?.firstName ?? "Quelqu'un";

    const payload = {
      notification: {
        title: `Nouveau message de ${senderName}`,
        body: messageData.content || "Vous a envoyé une image.",
        tag: chatId, 
      },
      android: {
        priority: "high" as const,
        notification: {
          // CORRECTION: Utilisation du bon channelId
          channelId: "fcm_default_channel",
          sound: "default",
        },
      },
      data: {
        chatId: chatId,
        senderId: senderId,
      },
    };
    
    for (const recipientId of recipientIds) {
        const tokens = await getRecipientTokens(recipientId);
        await sendFcmNotification(tokens, payload);
    }
  });

// --- Fonction callable pour envoyer des notifications génériques ---
export const sendNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté.');
    }

    const { userId, payload } = data;

    if(!userId || !payload){
        throw new functions.https.HttpsError('invalid-argument', 'Les paramètres userId et payload sont requis.');
    }

    console.log(`Callable function triggered by ${context.auth.uid} to notify ${userId}`);

    const tokens = await getRecipientTokens(userId);
    await sendFcmNotification(tokens, payload);

    return { success: true, message: `Notification envoyée à ${userId}` };
});
