
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import algoliasearch from "algoliasearch";

admin.initializeApp();

// --- Configuration Algolia ---
// A FAIRE : Remplacez par vos propres clés. La clé ADMIN doit être une variable d'environnement.
const ALGOLIA_APP_ID = "H8QSO88UZ6";
// NE PAS METTRE LA VRAIE CLE ICI. Nous utiliserons les variables d'environnement.
const ALGOLIA_ADMIN_KEY = functions.config().algolia.key; 
const ALGOLIA_INDEX_NAME = "users";

const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const usersIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

// --- FIN Configuration Algolia ---


const adminProjectId = admin.app().options.projectId;

export const sendNewMessageNotificationV2 = functions.region("europe-west1")
  .firestore.document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    
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


/**
 * Cloud Function qui se déclenche à chaque écriture (création/mise à jour/suppression)
 * dans la collection 'users' de Firestore pour synchroniser avec Algolia.
 */
export const syncUserToAlgolia = functions.region("europe-west1")
  .firestore.document("users/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;

    // --- 1. Gérer la Suppression ---
    if (!change.after.exists) {
      functions.logger.log(`User ${userId} deleted from Firestore. Removing from Algolia.`);
      try {
        await usersIndex.deleteObject(userId);
        functions.logger.log(`✅ Successfully removed user ${userId} from Algolia.`);
      } catch (error) {
        functions.logger.error(`❌ Error removing user ${userId} from Algolia:`, error);
      }
      return;
    }

    // --- 2. Gérer la Création / Mise à jour ---
    const userData = change.after.data();
    if (!userData) {
      functions.logger.log(`User data for ${userId} is empty. Skipping Algolia sync.`);
      return;
    }

    // Préparation de l'objet pour Algolia.
    // On ne sélectionne que les champs utiles pour la recherche et le filtrage.
    const record = {
      objectID: userId,
      firstName: userData.firstName || null,
      age: userData.age || null,
      gender: userData.gender || null,
      location: userData.location || null,
      destination: userData.destination || "Toutes",
      travelStyle: userData.travelStyle || "Tous",
      activities: userData.activities || "Toutes",
      intention: userData.intention || null,
      bio: userData.bio || null,
      profilePictures: userData.profilePictures || [],
      onboardingCompleted: userData.onboardingCompleted || false,
    };

    functions.logger.log(`Syncing user ${userId} to Algolia...`, {objectID: record.objectID, age: record.age, gender: record.gender});

    // On n'indexe que les profils qui ont terminé l'onboarding.
    if (!record.onboardingCompleted) {
        functions.logger.log(`User ${userId} has not completed onboarding. Deleting from Algolia to hide from search.`);
        try {
            await usersIndex.deleteObject(userId);
        } catch(e) {
            // Ignorer l'erreur si l'objet n'existe pas
        }
        return;
    }

    try {
      await usersIndex.saveObject(record);
      functions.logger.log(`✅ Successfully synced user ${userId} to Algolia.`);
    } catch (error) {
      functions.logger.error(`❌ Error syncing user ${userId} to Algolia:`, error);
    }
  });
