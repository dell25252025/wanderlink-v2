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
    const { senderId, text } = messageData;
    if (!senderId) {
        console.error("L'ID de l'expéditeur est manquant. Fin de la fonction.");
        return;
    }
    // --- DÉBUT DE LA CORRECTION ROBUSTE ---
    console.log(`[DEBUG] Traitement du message. SenderId: ${senderId}`);
    let senderName = "Un utilisateur"; // Nom par défaut
    try {
        const senderDoc = await db.collection("users").doc(senderId).get();
        // Logs de débogage suggérés par l'IA
        console.log(`[DEBUG] senderDoc exists: ${senderDoc.exists}`);
        if (senderDoc.exists) {
            console.log("[DEBUG] senderDoc data:", senderDoc.data());
        }
        if (senderDoc.exists) {
            const data = senderDoc.data();
            // Fallback intelligent pour trouver le nom
            senderName =
                data.displayName ||
                    data.name ||
                    data.username ||
                    "Un utilisateur"; // Fallback final si aucun nom n'est trouvé
            console.log(`[INFO] Nom de l'expéditeur trouvé: '${senderName}'`);
        }
        else {
            console.log(`[WARN] Document de l'expéditeur non trouvé pour ID: ${senderId}.`);
        }
    }
    catch (error) {
        console.error(`[ERROR] Erreur lors de la récupération du profil de l'expéditeur (ID: ${senderId}):`, error);
    }
    // --- FIN DE LA CORRECTION ROBUSTE ---
    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists || !((_a = chatDoc.data()) === null || _a === void 0 ? void 0 : _a.participants)) {
        console.log(`Document du chat ou participants non trouvés pour ${chatId}.`);
        return;
    }
    const participants = chatDoc.data().participants;
    const recipientId = participants.find(id => id !== senderId);
    if (!recipientId) {
        console.log("Destinataire non trouvé.");
        return;
    }
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
    const userDoc = await db.collection("users").doc(recipientId).get();
    if (!userDoc.exists || !((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.fcmTokens)) {
        return;
    }
    const tokens = userDoc.data().fcmTokens;
    if (tokens.length === 0) {
        return;
    }
    const payload = {
        tokens: tokens,
        notification: { title: senderName, body: text || "..." },
        data: { type: "MESSAGE", chatId: chatId },
        android: {
            priority: "high",
            notification: { title: senderName, body: text || "...", channelId: "messages", tag: chatId },
        },
        apns: { payload: { aps: { sound: "default", "content-available": 1 } } },
    };
    try {
        await admin.messaging().sendEachForMulticast(payload);
    }
    catch (error) {
        console.error("Erreur d'envoi des notifications FCM:", error);
    }
});
//# sourceMappingURL=notifications.js.map