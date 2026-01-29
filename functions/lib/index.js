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
    functions.logger.info("--- DÉPLOIEMENT FORCÉ - VERSION DU 28/01 ---"); // LIGNE AJOUTÉE
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
    // NOUVELLE PARTIE AMÉLIORÉE
    functions.logger.info(`Récupération des tokens pour le receiverId: '${receiverId}'`);
    // 2. Récupérer les tokens FCM du destinataire
    const tokensSnapshot = await admin
        .firestore()
        .collection("users")
        .doc(receiverId)
        .collection("fcmTokens")
        .get();
    functions.logger.info(`Snapshot de la collection 'fcmTokens' obtenu. La collection est-elle vide ? ${tokensSnapshot.empty}. Nombre de documents: ${tokensSnapshot.size}`);
    if (tokensSnapshot.empty) {
        functions.logger.warn(`Aucun token FCM trouvé pour l'utilisateur ${receiverId}. Notification annulée.`);
        return;
    }
    // 3. Extraire et logger la liste des tokens (logique améliorée)
    const tokens = [];
    tokensSnapshot.docs.forEach(doc => {
        const docData = doc.data();
        const tokenFromField = docData.token;
        if (tokenFromField && typeof tokenFromField === 'string') {
            functions.logger.info(`Token trouvé dans le champ 'token' du document ${doc.id}`);
            tokens.push(tokenFromField);
        }
        else {
            functions.logger.info(`Champ 'token' non trouvé ou invalide dans le document ${doc.id}. Utilisation de l'ID du document comme token.`);
            tokens.push(doc.id);
        }
    });
    const validTokens = tokens.filter(t => t && typeof t === 'string' && t.length > 0);
    if (validTokens.length === 0) {
        functions.logger.warn(`Après filtrage, aucun token valide n'a été trouvé pour l'utilisateur ${receiverId}. Notification annulée.`);
        return;
    }
    const maskedTokens = validTokens.map(token => `${token.substring(0, 10)}...`);
    functions.logger.info(`Trouvé ${validTokens.length} token(s) valide(s) pour ${receiverId}:`, maskedTokens);
    // 4. Préparer le payload de la notification
    const payload = {
        notification: {
            title: "Nouveau message",
            body: text || "Vous avez reçu un nouveau message",
            sound: "default",
        },
    };
    const multicastMessage = {
        tokens: validTokens,
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
                    functions.logger.error(`Échec de l'envoi au token ${maskedTokens[index]}`, { code: error.code, message: error.message, });
                    if (error.code === "messaging/invalid-registration-token" ||
                        error.code === "messaging/registration-token-not-registered") {
                        // Trouver le document original à supprimer
                        const tokenToDelete = validTokens[index];
                        const docToDelete = tokensSnapshot.docs.find(doc => doc.id === tokenToDelete || doc.data().token === tokenToDelete);
                        if (docToDelete) {
                            tokensToRemove.push(docToDelete.ref.delete());
                        }
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