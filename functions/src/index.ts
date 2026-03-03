
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

export const onNewMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const messageData = snapshot.data();
    const chatId = context.params.chatId;

    if (!messageData) {
      console.log("No data in the new message.");
      return;
    }

    const senderId = messageData.senderId;
    console.log(`New message from ${senderId} in chat ${chatId}.`);

    // Get chat participants
    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();
    const chatData = chatDoc.data();

    if (!chatData || !chatData.participants) {
      console.log("Chat data or participants not found.");
      return;
    }

    // Find the recipient (the other participant)
    const recipientId = chatData.participants.find((p: string) => p !== senderId);
    if (!recipientId) {
      console.log("Recipient not found.");
      return;
    }
    console.log(`Recipient identified: ${recipientId}.`);

    // Get sender's info for the notification
    const senderDoc = await db.collection("users").doc(senderId).get();
    const senderData = senderDoc.data();
    const senderName = senderData?.firstName ?? "Someone";

    // Get the recipient's FCM tokens
    const tokensRef = db.collection("users").doc(recipientId).collection("tokens");
    const tokensSnapshot = await tokensRef.get();

    if (tokensSnapshot.empty) {
      console.log("No FCM tokens for recipient.");
      return;
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.id);
    console.log(`Found tokens for recipient: ${tokens.join(", ")}`);

    // Prepare the notification payload
    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: `New message from ${senderName}`,
        body: messageData.text || "Sent you an image.", // Fallback for images
        clickAction: "FLUTTER_NOTIFICATION_CLICK", // Important for Capacitor
      },
      data: {
        chatId: chatId, // Send chat ID for redirection
      },
    };

    // Send notification to all tokens
    const response = await fcm.sendToDevice(tokens, payload);
    console.log("Notification sent successfully:", response);

    // Handle invalid tokens
    const tokensToRemove: Promise<any>[] = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error("Failed to send notification to token:", tokens[index], error);
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokensRef.doc(tokens[index]).delete());
        }
      }
    });

    return Promise.all(tokensToRemove);
  });
