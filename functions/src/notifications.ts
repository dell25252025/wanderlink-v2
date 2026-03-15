import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onNewMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {

    const messageData = snapshot.data();
    const chatId = context.params.chatId;

    if (!messageData) {
      console.log("Message data is undefined. Exiting function.");
      return;
    }

    const senderId = messageData.senderId;
    const text = messageData.text || "Nouveau message";

    // 1. Get the chat document to find the recipient
    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists) {
      console.log(`Chat document ${chatId} not found.`);
      return;
    }

    const chatData = chatDoc.data();
    if (!chatData) {
      console.log(`Chat data for ${chatId} is undefined.`);
      return;
    }
    const participants: string[] = chatData.participants || [];

    // 2. Determine the recipient's ID (the other person in the chat)
    const recipientId = participants.find(id => id !== senderId);

    if (!recipientId) {
      console.log("Recipient could not be determined.");
      return;
    }

    // 3. Get the recipient's user document to find their FCM tokens
    const userDoc = await db.collection("users").doc(recipientId).get();
    if (!userDoc.exists) {
      console.log(`Recipient user document ${recipientId} not found.`);
      return;
    }

    const userData = userDoc.data();
    if (!userData) {
      console.log(`User data for ${recipientId} is undefined.`);
      return;
    }
    const tokens: string[] = userData.fcmTokens || [];

    // 4. Check if there are any tokens to send to
    if (tokens.length === 0) {
      console.log(`No FCM tokens found for user ${recipientId}.`);
      return;
    }

    // 5. Construct the notification payload
    const payload: admin.messaging.MulticastMessage = {
      tokens: tokens,
      notification: {
        title: "Nouveau message", // You can customize this, e.g., `Nouveau message de ${senderName}`
        body: text
      },
      data: {
        chatId: chatId // Send chatId to allow navigation on notification click
      },
      android: {
        priority: "high"
      },
      apns: {
        payload: {
          aps: {
            sound: "default"
          }
        }
      }
    };

    // 6. Send the notification
    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log("Notifications sent successfully:", `${response.successCount} of ${tokens.length}`);
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  });
