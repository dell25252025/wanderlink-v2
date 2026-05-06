"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreated = exports.sendNewMessageNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
// ÉTAPE 1: Simplifier l'ancienne fonction. Elle ne fait plus qu'écrire dans la BDD.
// La nouvelle fonction (plus bas) se chargera d'envoyer le push.
exports.sendNewMessageNotification = functions.firestore
    .document("chats/{chatId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
    var _a;
    const messageData = snapshot.data();
    const { chatId } = context.params;
    if (!messageData)
        return;
    const { senderId, text } = messageData;
    if (!senderId)
        return;
    let senderName = "Un utilisateur";
    try {
        const senderDoc = await db.collection("users").doc(senderId).get();
        if (senderDoc.exists) {
            const data = senderDoc.data();
            senderName = data.displayName || data.name || data.username || "Un utilisateur";
        }
    }
    catch (error) {
        console.error(`Erreur lors de la récupération du profil de l'expéditeur (ID: ${senderId}):`, error);
    }
    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists || !((_a = chatDoc.data()) === null || _a === void 0 ? void 0 : _a.participants))
        return;
    const participants = chatDoc.data().participants;
    const recipientId = participants.find(id => id !== senderId);
    if (!recipientId)
        return;
    // La fonction s'arrête ici : elle crée la notif dans Firestore, et c'est tout.
    try {
        await db.collection(`users/${recipientId}/notifications`).add({
            type: "message",
            chatId: chatId,
            senderId: senderId,
            senderName: senderName,
            text: text || "Vous a envoyé un message",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });
    }
    catch (error) {
        console.error("Erreur lors de la création de la notif dans Firestore:", error);
    }
});
// ÉTAPE 2: Nouvelle fonction universelle qui envoie un PUSH pour TOUTES les notifications.
exports.onNotificationCreated = functions.firestore
    .document("users/{userId}/notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
    var _a;
    const { userId } = context.params;
    const notifData = snapshot.data();
    if (!notifData) {
        console.log("Aucune donnée de notification, on quitte.");
        return;
    }
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmTokens)) {
        console.log(`L'utilisateur ${userId} n'a pas de tokens FCM.`);
        return;
    }
    const tokens = userDoc.data().fcmTokens;
    if (tokens.length === 0) {
        console.log(`L'utilisateur ${userId} n'a pas de token valide.`);
        return;
    }
    const payload = {
        tokens: tokens,
        notification: {
            title: notifData.senderName || "Nouvelle notification",
            body: notifData.text || "Vous avez une nouvelle notification.",
        },
        data: {
            type: notifData.type, // 'message' or 'like'
            chatId: notifData.chatId || '',
            photoUrl: notifData.photoUrl || '',
            senderId: notifData.senderId || '',
        },
        android: {
            priority: "high",
            notification: {
                channelId: "messages", // On réutilise le canal existant
                tag: notifData.chatId || context.params.notificationId,
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
        console.log("Notification push envoyée avec succès à", userId);
    }
    catch (error) {
        console.error("Erreur lors de l'envoi de la notification push:", error);
    }
});
//# sourceMappingURL=notifications.js.map