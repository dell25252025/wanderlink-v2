"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewMessageNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.sendNewMessageNotification = functions.firestore
    .document("chats/{chatId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
    var _a, _b;
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
    if (!chatDoc.exists || !((_a = chatDoc.data()) === null || _a === void 0 ? void 0 : _a.participants)) {
        console.log(`Document du chat ou participants non trouvés pour ${chatId}.`);
        return;
    }
    const participants = chatDoc.data().participants;
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
            senderName: senderName || "Un utilisateur",
            text: text || "Vous a envoyé un message",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });
        console.log(`Notification pour ${recipientId} créée avec succès.`);
    }
    catch (error) {
        console.error("Erreur lors de la création de la notification dans Firestore:", error);
    }
    const userDoc = await db.collection("users").doc(recipientId).get();
    if (!userDoc.exists || !((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.fcmTokens)) {
        console.log(`Document ou tokens FCM non trouvés pour l'utilisateur ${recipientId}.`);
        return;
    }
    const tokens = userDoc.data().fcmTokens;
    if (tokens.length === 0) {
        console.log(`Aucun token FCM pour l'utilisateur ${recipientId}.`);
        return;
    }
    const payload = {
        tokens: tokens,
        // Notification générique pour iOS et Web
        notification: {
            title: senderName || "Nouveau message",
            body: text || "Vous a envoyé un message",
        },
        // Données pour la navigation
        data: {
            type: "MESSAGE",
            chatId: chatId,
        },
        // Configuration spécifique pour Android pour les notifications flottantes
        android: {
            priority: "high",
            notification: {
                title: senderName || "Nouveau message",
                body: text || "Vous a envoyé un message",
                channelId: "messages", // Canal configuré sur le client pour la haute priorité
                tag: chatId, // Regroupe les notifications par conversation
                visibility: "public",
                sound: "default",
                defaultSound: true,
                defaultVibrateTimings: true,
            },
        },
        // Configuration spécifique pour iOS
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
    }
    catch (error) {
        console.error("Erreur lors de l'envoi des notifications:", error);
    }
});
//# sourceMappingURL=notifications.js.map