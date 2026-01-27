
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Se déclenche à la création d'un nouveau message dans n'importe quelle conversation.
 */
export const sendNewMessageNotificationV2 = functions.region("europe-west1")
  .firestore.document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    if (!message) {
      functions.logger.error("Le document de message est vide.");
      return;
    }

    const { senderId, receiverId, text } = message;
    functions.logger.info(`Nouveau message détecté de ${senderId} à ${receiverId}.`);

    // --- LOGIQUE SPÉCIFIQUE ---

    // 1. Ne pas envoyer de notification à soi-même
    if (senderId === receiverId) {
      functions.logger.log("Le sender et le receiver sont identiques. Notification annulée.");
      return;
    }

    // 2. Récupérer les tokens FCM du destinataire depuis Firestore
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

    // 3. Extraire la liste des tokens
    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
    functions.logger.info(`Trouvé ${tokens.length} token(s) pour l'utilisateur ${receiverId}.`);

    // 4. Préparer le payload de la notification
    const payload = {
      notification: {
        title: "Nouveau message",
        body: text || "Vous avez reçu un nouveau message", // Utilise le texte du message si disponible
        sound: "default",
        // Vous pouvez ajouter une icône ou d'autres paramètres ici
        // icon: "URL_DE_VOTRE_ICONE",
      },
    };

    const multicastMessage = {
      tokens: tokens,
      notification: payload.notification,
    };

    // 5. Envoyer la notification via FCM
    try {
      const batchResponse = await admin.messaging().sendEachForMulticast(multicastMessage);
      functions.logger.info(`${batchResponse.successCount} messages envoyés avec succès.`);

      // Optionnel mais recommandé : Nettoyer les tokens invalides de la base de données
      const tokensToRemove: Promise<any>[] = [];
      batchResponse.responses.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            `Échec de l'envoi au token ${tokens[index]}`,
            error
          );
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(tokensSnapshot.docs[index].ref.delete());
          }
        }
      });

      await Promise.all(tokensToRemove);
      functions.logger.log("Nettoyage des tokens invalides terminé.");

    } catch (error) {
      functions.logger.error("Erreur majeure lors de l'envoi des notifications:", error);
    }
  });
