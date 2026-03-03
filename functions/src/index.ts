
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { RtcTokenBuilder, RtcRole } from "agora-token";

const cors = require("cors")({ origin: true });

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

// --- Fonction pour les appels vidéo AGORA (avec CORS) ---
export const generateAgoraToken = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { channelName, uid } = request.body;

    if (!channelName || !uid) {
      response.status(400).send("channelName and uid are required.");
      return;
    }

    const APP_ID = "d30835a6438747448375631433f00889";
    const APP_CERTIFICATE = "9a72175968d440739e8310f8490a7860";
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
      // CORRECTION 1: Fournir les 7 arguments attendus par la librairie
      const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        role,
        privilegeExpiredTs, // token expiration
        privilegeExpiredTs  // privilege expiration
      );
      console.log(`Generated Agora token for channel ${channelName} and uid ${uid}`);
      response.status(200).json({ token });
    } catch (error) {
      console.error("Error generating Agora token:", error);
      response.status(500).send("Error generating Agora token.");
    }
  });
});

// --- Fonction pour les NOTIFICATIONS PUSH ---
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

    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();
    const chatData = chatDoc.data();

    if (!chatData || !chatData.participants) {
      console.log("Chat data or participants not found.");
      return;
    }

    const recipientId = chatData.participants.find((p: string) => p !== senderId);
    if (!recipientId) {
      console.log("Recipient not found.");
      return;
    }
    console.log(`Recipient identified: ${recipientId}.`);

    const senderDoc = await db.collection("users").doc(senderId).get();
    const senderData = senderDoc.data();
    const senderName = senderData?.firstName ?? "Someone";

    const tokensRef = db.collection("users").doc(recipientId).collection("fcmTokens");
    const tokensSnapshot = await tokensRef.get();

    if (tokensSnapshot.empty) {
      console.log("No FCM tokens for recipient.");
      return;
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.id);
    console.log(`Found tokens for recipient: ${tokens.join(", ")}`);

    // CORRECTION 2: Ne pas spécifier de type ici, Laisser TypeScript l'inférer
    const payload = {
      notification: {
        title: `New message from ${senderName}`,
        body: messageData.text || "Sent you an image.",
      },
      android: {
        priority: "high" as const, // 'as const' aide TypeScript
        notification: {
          channelId: "messages",
          sound: "default",
        },
      },
      data: {
        chatId: chatId,
      },
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));
    // Le payload sera validé ici, et il est maintenant correct
    const response = await fcm.sendToDevice(tokens, payload);
    console.log("FCM response:", JSON.stringify(response, null, 2));

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
