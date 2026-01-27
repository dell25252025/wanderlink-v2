"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewMessageNotificationV2 = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Se déclenche à la création d'un nouveau message dans n'importe quelle conversation.
 */
exports.sendNewMessageNotificationV2 = functions.region("europe-west1")
    .firestore.document("conversations/{conversationId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
    // --- Log des identifiants ---
    const messageId = context.params.messageId;
    const conversationId = context.params.conversationId;
    functions.logger.info(`--- Début du traitement pour le message ${messageId} dans la conversation ${conversationId} ---`);
    const message = snapshot.data();
    if (!message) {
        functions.logger.error("Le document de message est vide. Fin du traitement.");
        return;
    }
    const { senderId, receiverId, text } = message;
    functions.logger.info(`Message de: ${senderId}, Pour: ${receiverId}`);
    // 1. Ne pas envoyer de notification à soi-même
    if (senderId === receiverId) {
        functions.logger.log("Le sender et le receiver sont identiques. Notification annulée.");
        return;
    }
    // 2. Récupérer les tokens FCM du destinataire
    const tokensSnapshot = await admin
        .firestore()
        .collection("users")
        .doc(receiverId)
        .collection("fcmTokens")
        .get();
    if (tokensSnapshot.empty) {
        functions.logger.warn(`Aucun token FCM trouvé pour l'utilisateur ${receiverId}. Notification annulée.`);
        return;
    }
    // 3. Extraire et logger la liste des tokens
    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
    const maskedTokens = tokens.map(token => `${token.substring(0, 10)}...`);
    functions.logger.info(`Trouvé ${tokens.length} token(s) pour ${receiverId}:`, maskedTokens);
    // 4. Préparer le payload de la notification
    const payload = {
        notification: {
            title: "Nouveau message",
            body: text || "Vous avez reçu un nouveau message",
            sound: "default",
        },
    };
    const multicastMessage = {
        tokens: tokens,
        notification: payload.notification,
    };
    // 5. Envoyer la notification via FCM
    try {
        const batchResponse = await admin.messaging().sendEachForMulticast(multicastMessage);
        functions.logger.info(`${batchResponse.successCount} message(s) envoyé(s) avec succès.`);
        if (batchResponse.failureCount > 0) {
            const tokensToRemove = [];
            batchResponse.responses.forEach((result, index) => {
                const error = result.error;
                if (error) {
                    // Log détaillé de l'erreur FCM
                    functions.logger.error(`Échec de l'envoi au token ${maskedTokens[index]}`, {
                        code: error.code,
                        message: error.message,
                    });
                    // Planifier la suppression des tokens invalides
                    if (error.code === "messaging/invalid-registration-token" ||
                        error.code === "messaging/registration-token-not-registered") {
                        tokensToRemove.push(tokensSnapshot.docs[index].ref.delete());
                    }
                }
            });
            await Promise.all(tokensToRemove);
            if (tokensToRemove.length > 0) {
                functions.logger.log(`${tokensToRemove.length} token(s) invalide(s) supprimé(s).`);
            }
        }
    }
    catch (error) {
        functions.logger.error("Erreur majeure lors de l'envoi des notifications:", error);
    }
    functions.logger.info(`--- Fin du traitement pour le message ${messageId} ---`);
});
//# sourceMappingURL=index.js.map