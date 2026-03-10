
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const db = admin.firestore();
const fcm = admin.messaging();

async function getRecipientTokens(userId: string): Promise<string[]> {
  const tokensRef = db.collection("users").doc(userId).collection("fcmTokens");
  const tokensSnapshot = await tokensRef.get();
  if (tokensSnapshot.empty) {
    console.log(`[DIAGNOSTIC] No FCM tokens found for recipient: ${userId}`);
    return [];
  }
  const tokens = tokensSnapshot.docs.map((doc) => doc.id);
  console.log(`[DIAGNOSTIC] Found tokens for ${userId}: ${tokens.join(", ")}`);
  return tokens;
}

async function sendFcmNotification(tokens: string[], payload: admin.messaging.DataMessagePayload): Promise<void> {
  if (tokens.length === 0) {
      console.log("[DIAGNOSTIC] Token list is empty, skipping FCM send.");
      return;
  }
  
  const message: admin.messaging.MulticastMessage = {
      tokens,
      data: payload,
      android: {
        priority: "high",
      }
  };

  console.log("[DIAGNOSTIC] Sending DATA-ONLY multicast message with payload:", JSON.stringify(message, null, 2));
  try {
    const response = await fcm.sendEachForMulticast(message);
    console.log(`[DIAGNOSTIC] FCM response: ${response.successCount} success, ${response.failureCount} failure`);
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          console.error(`[DIAGNOSTIC] Failure for token: ${tokens[idx]}`, resp.error);
        }
      });
    }
  } catch (error) {
    console.error("[DIAGNOSTIC] Critical error sending FCM message:", error);
  }
}

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
    
    const senderDoc = await db.collection("users").doc(senderId).get();
    const senderName = senderDoc.data()?.firstName ?? "Quelqu'un";

    const payload: admin.messaging.DataMessagePayload = {
        type: "MESSAGE",
        title: `Nouveau message de ${senderName}`,
        body: messageData.content || "Vous a envoyé une image.",
        chatId: chatId,
        senderId: senderId,
        tag: chatId,
    };
    
    for (const recipientId of recipientIds) {
        const tokens = await getRecipientTokens(recipientId);
        if (tokens.length > 0) {
            await sendFcmNotification(tokens, payload);
        }
    }
  });

export const sendNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté.');
    }
    const { userId, payload } = data;
    if(!userId || !payload){
        throw new functions.https.HttpsError('invalid-argument', 'Les paramètres userId et payload sont requis.');
    }
    const tokens = await getRecipientTokens(userId);
    await sendFcmNotification(tokens, payload);
    return { success: true, message: `Notification envoyée à ${userId}` };
});
