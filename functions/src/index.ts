
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const sendNewMessageNotificationV2 = functions.region("europe-west1")
  .firestore.document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    if (!message) {
      functions.logger.error("Message data is empty.");
      return;
    }

    const { senderId, receiverId } = message;
    if (senderId === receiverId) {
      functions.logger.log("Sender and receiver are the same, no notification sent.");
      return;
    }

    const tokensSnapshot = await admin
      .firestore()
      .collection("users")
      .doc(receiverId)
      .collection("fcmTokens")
      .get();

    if (tokensSnapshot.empty) {
      functions.logger.warn(`No FCM tokens found for user ${receiverId}.`);
      return;
    }

    // --- MODIFICATION: Logique de filtrage et de collecte améliorée ---
    const tokensData: { token: string; ref: admin.firestore.DocumentReference }[] = [];
    tokensSnapshot.forEach(doc => {
      const token = doc.data().token;
      // Ajout d'un filtre de validité de base
      if (token && typeof token === 'string' && token.length > 10) {
        tokensData.push({ token, ref: doc.ref });
      }
    });

    if (tokensData.length === 0) {
      functions.logger.warn("No valid tokens found after filtering.");
      return;
    }

    const tokensToSend = tokensData.map(data => data.token);
    const payload = {
      notification: {
        title: "Nouveau message",
        body: message.text || "Vous avez reçu un nouveau message",
        sound: "default",
      },
    };

    try {
      const response = await admin.messaging().sendEach(tokensToSend.map(token => ({ token, notification: payload.notification })));
      functions.logger.info(`${response.successCount} messages were sent successfully.`);

      // --- DEBUT DE LA NOUVELLE LOGIQUE D'AUTO-NETTOYAGE ---
      if (response.failureCount > 0) {
        const tokensToDelete: Promise<void>[] = [];
        response.responses.forEach((result, index) => {
          const error = result.error;
          if (error) {
            const failedToken = tokensToSend[index];
            functions.logger.error(`Failure sending notification to token: ${failedToken}`, error);

            // Si l'erreur est que le token n'est pas enregistré, on le supprime
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              const tokenDataToDelete = tokensData[index];
              functions.logger.log(`Marking token for deletion: ${tokenDataToDelete.ref.path}`);
              tokensToDelete.push(tokenDataToDelete.ref.delete());
            }
          }
        });

        await Promise.all(tokensToDelete);
        functions.logger.info(`${tokensToDelete.length} invalid tokens have been deleted.`);
      }
       // --- FIN DE LA NOUVELLE LOGIQUE D'AUTO-NETTOYAGE ---

    } catch (error) {
      functions.logger.error("Error sending notifications:", error);
    }
  });
