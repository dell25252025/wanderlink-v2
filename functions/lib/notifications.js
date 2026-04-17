"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewMessageNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Assurer l'initialisation de Firebase Admin
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
    // Récupérer les informations clés du message, y compris le nom de l'expéditeur
    const { senderId, text, senderName } = messageData;
    if (!senderId) {
        console.error("L'ID de l'expéditeur est manquant. Fin de la fonction.");
        return;
    }
    // 1. Obtenir le document du chat pour trouver le destinataire
    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists || !((_a = chatDoc.data()) === null || _a === void 0 ? void 0 : _a.participants)) {
        console.log(`Document du chat ou participants non trouvés pour ${chatId}.`);
        return;
    }
    const participants = chatDoc.data().participants;
    // 2. Déterminer l'ID du destinataire
    const recipientId = participants.find(id => id !== senderId);
    if (!recipientId) {
        console.log("Destinataire non trouvé (l'utilisateur est peut-être seul dans le chat).");
        return;
    }
    // 3. Obtenir les tokens FCM du destinataire
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
    // 5. Construire le payload de notification "PRO"
    const payload = {
        tokens: tokens,
        notification: {
            title: senderName || "Nouveau message", // Titre dynamique
            body: text || "Vous a envoyé un message",
        },
        data: {
            type: "MESSAGE", // Pour une gestion future de différents types de notifs
            chatId: chatId,
            senderId: senderId,
            senderName: senderName || "Un utilisateur",
        },
        android: {
            priority: "high",
            notification: {
                channelId: "messages", // Lien vers le canal créé sur Android
                tag: chatId, // Regroupe les notifications du même chat
                visibility: "public",
                sound: "default",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    "content-available": 1, // Pour les mises à jour en arrière-plan sur iOS
                },
            },
        },
    };
    // 6. Envoyer la notification
    try {
        const response = await admin.messaging().sendEachForMulticast(payload);
        console.log("Notifications envoyées avec succès:", `${response.successCount} sur ${tokens.length}`);
    }
    catch (error) {
        console.error("Erreur lors de l'envoi des notifications:", error);
    }
});
//# sourceMappingURL=notifications.js.map