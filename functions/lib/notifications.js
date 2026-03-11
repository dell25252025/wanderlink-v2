"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.onNewMessage = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const db = admin.firestore();
async function getRecipientTokens(userId) {
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
async function sendFcmNotification(tokens, notification, data) {
    if (tokens.length === 0) {
        console.log("[DIAGNOSTIC] Token list is empty, skipping FCM send.");
        return;
    }
    const message = {
        tokens,
        notification: notification, // CRUCIAL: Ajout de l'objet notification
        data: data, // CRUCIAL: Ajout de l'objet data
        android: {
            priority: "high",
            notification: {
                channelId: "messages" // CRUCIAL: Spécifier le canal pour la visibilité
            }
        },
        apns: {
            payload: {
                aps: {
                    'content-available': 1,
                    'sound': 'default'
                },
            },
            headers: {
                'apns-push-type': 'background',
                'apns-priority': '5',
                'apns-topic': 'com.wanderlink.app' // Assurez-vous que cela correspond à votre Bundle ID
            }
        },
    };
    console.log("[DIAGNOSTIC] Sending HYBRID multicast message with payload:", JSON.stringify(message, null, 2));
    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[DIAGNOSTIC] FCM response: ${response.successCount} success, ${response.failureCount} failure`);
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    console.error(`[DIAGNOSTIC] Failure for token: ${tokens[idx]}`, resp.error);
                }
            });
        }
    }
    catch (error) {
        console.error("[DIAGNOSTIC] Critical error sending FCM message:", error);
    }
}
exports.onNewMessage = functions.firestore
    .document("groupChats/{chatId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    const messageData = snapshot.data();
    if (!messageData) {
        console.log("No data in the new message.");
        return;
    }
    const senderId = messageData.senderId;
    const chatRef = db.collection("groupChats").doc(context.params.chatId);
    const chatDoc = await chatRef.get();
    const chatData = chatDoc.data();
    if (!chatData || !chatData.participants) {
        console.log("Chat data or participants not found.");
        return;
    }
    const recipientIds = chatData.participants.filter((p) => p !== senderId);
    if (recipientIds.length === 0) {
        console.log("No recipients to notify.");
        return;
    }
    const senderDoc = await db.collection("users").doc(senderId).get();
    const senderName = (_b = (_a = senderDoc.data()) === null || _a === void 0 ? void 0 : _a.firstName) !== null && _b !== void 0 ? _b : "Quelqu'un";
    // Préparation du payload pour la notification
    const notification = {
        title: `Nouveau message de ${senderName}`,
        body: messageData.content || "Vous a envoyé une image.",
    };
    const data = {
        type: "MESSAGE",
        chatId: context.params.chatId,
    };
    for (const recipientId of recipientIds) {
        const tokens = await getRecipientTokens(recipientId);
        if (tokens.length > 0) {
            await sendFcmNotification(tokens, notification, data);
        }
    }
});
// Cette fonction reste pour des tests ou des usages futurs
exports.sendNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté.');
    }
    const { userId, notification, payload } = data;
    if (!userId || !notification || !payload) {
        throw new functions.https.HttpsError('invalid-argument', 'Les paramètres userId, notification et payload sont requis.');
    }
    const tokens = await getRecipientTokens(userId);
    await sendFcmNotification(tokens, notification, payload);
    return { success: true, message: `Notification envoyée à ${userId}` };
});
//# sourceMappingURL=notifications.js.map