
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// --- NOUVELLE LIGNE DE VÉRIFICATION ---
const adminProjectId = admin.app().options.projectId;

export const sendNewMessageNotificationV2 = functions.region("europe-west1")
  .firestore.document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    
    // --- NOUVELLE LIGNE DE LOG ---
    functions.logger.info(`--- Cloud Function is running for Firebase project: ${adminProjectId} ---`);

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

    const tokensData: { token: string; ref: admin.firestore.DocumentReference }[] = [];
    tokensSnapshot.forEach(doc => {
      const token = doc.data().token;
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
        // sound: "default",  <-- LIGNE SUPPRIMÉE
      },
    };

    try {
      const response = await admin.messaging().sendEach(tokensToSend.map(token => ({ token, notification: payload.notification })));
      functions.logger.info(`${response.successCount} messages were sent successfully.`);

      if (response.failureCount > 0) {
        const tokensToDelete: Promise<admin.firestore.WriteResult>[] = [];
        response.responses.forEach((result, index) => {
          const error = result.error;
          if (error) {
            const failedToken = tokensToSend[index];
            functions.logger.error(`Failure sending notification to token: ${failedToken}`, error);

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

    } catch (error) {
      functions.logger.error("Error sending notifications:", error);
    }
  });
