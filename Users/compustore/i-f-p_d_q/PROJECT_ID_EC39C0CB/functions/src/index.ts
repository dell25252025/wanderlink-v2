
import * as admin from "firebase-admin";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import algoliasearch, { type SearchClient } from "algoliasearch";
import * as logger from "firebase-functions/logger";

// Import v2 functions
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onUserDeleted } from "firebase-functions/v2/auth"; // Added import

// Define parameters for environment variables
import { defineString } from "firebase-functions/params";

// Import your custom function
import { generateAgoraToken as agoraTokenGenerator } from "./agora";

const ALGOLIA_APP_ID = defineString("ALGOLIA_APP_ID");
const ALGOLIA_ADMIN_KEY = defineString("ALGOLIA_ADMIN_KEY");
const ALGOLIA_SEARCH_KEY = defineString("ALGOLIA_SEARCH_KEY");

admin.initializeApp();

// Lazily initialize clients to avoid timeout issues on cold start
let algoliaClient: SearchClient | null = null;
let visionClient: ImageAnnotatorClient | null = null;

const getAlgoliaClient = (): SearchClient => {
    if (!algoliaClient) {
        const appId = ALGOLIA_APP_ID.value();
        const adminKey = ALGOLIA_ADMIN_KEY.value();
        if (!appId || !adminKey) {
            logger.error("Algolia App ID or Admin Key is not configured.");
            throw new Error("Algolia configuration is missing.");
        }
        algoliaClient = algoliasearch(appId, adminKey);
    }
    return algoliaClient;
};

const getVisionClient = (): ImageAnnotatorClient => {
    if (!visionClient) {
        visionClient = new ImageAnnotatorClient();
    }
    return visionClient;
};


// This function handles creations, updates, and deletions.
export const syncUserToAlgolia = onDocumentWritten("users/{userId}", async (event) => {
    const objectID = event.params.userId;
    const usersIndex = getAlgoliaClient().initIndex("users");

    // Case 1: Document deleted from Firestore OR onboarding is not complete
    if (!event.data?.after.exists || event.data.after.data()?.onboardingCompleted !== true) {
        try {
            // Attempt to delete the object from Algolia.
            // This is safe to call even if the object doesn't exist.
            await usersIndex.deleteObject(objectID);
            
            if (!event.data?.after.exists) {
                logger.log(`SUCCESS: User ${objectID} deleted from Algolia index 'users'.`);
            } else {
                logger.log(`INFO: Incomplete profile ${objectID} removed from Algolia index 'users'.`);
            }
        } catch (error) {
            // Log a warning if the deletion fails for some reason other than not found.
            logger.warn(`Warning while trying to delete user ${objectID} from Algolia index 'users':`, error);
        }
        return;
    }

    // Case 2: Document exists and onboarding is complete.
    const newData = event.data.after.data();

    // Construct a clean, predictable record for Algolia.
    // This ensures all filterable attributes exist.
    const algoliaRecord: any = {
        objectID,
        onboardingCompleted: true,

        // --- Core display attributes ---
        firstName: newData.firstName || '',
        profilePictures: newData.profilePictures || [],
        isVerified: newData.isVerified || false,
        
        // --- Filterable attributes with safe defaults ---
        gender: newData.gender || null, // Use null for attributes that can be absent
        age: typeof newData.age === 'number' ? newData.age : -1, // Use -1 as a sentinel for missing age
        location: newData.location || null,
        destination: newData.destination || 'Toutes',
        intention: newData.intention || null,
        travelStyle: newData.travelStyle || 'Tous',
        activities: newData.activities || 'Toutes',
    };

    // Add geolocation if available
    if (newData.latitude && newData.longitude) {
        algoliaRecord._geoloc = { lat: newData.latitude, lng: newData.longitude };
    }
    
    logger.log(`SYNC: Preparing to index objectID '${objectID}' in index 'users'.`, { data: algoliaRecord });

    try {
        await usersIndex.saveObject(algoliaRecord);
        logger.log(`SUCCESS: User ${objectID} indexed in Algolia index 'users'.`);
    } catch (error) {
        logger.error(`FAILURE: Error indexing user ${objectID} in Algolia index 'users':`, error);
    }
});

// This function securely provides the frontend with the keys it needs.
export const getAlgoliaConfig = onCall((request) => {
  const appId = ALGOLIA_APP_ID.value();
  const searchKey = ALGOLIA_SEARCH_KEY.value();

  if (!appId || !searchKey) {
      throw new HttpsError('internal', 'Algolia configuration is missing on the server.');
  }

  return { appId: appId, searchKey: searchKey };
});


/**
 * Triggered when a new image is uploaded, moderates it using Google Cloud Vision API.
 */
export const moderateProfilePicture = onObjectFinalized(async (event) => {
    const { bucket, name, contentType } = event.data;

    if (!name?.startsWith("profilePictures/") || contentType?.endsWith("/") || !contentType?.startsWith("image/")) {
        logger.log(`File ${name} is not an image in profilePictures/ folder. Ignoring.`);
        return null;
    }

    const gcsUri = `gs://${bucket}/${name}`;

    try {
      const vision = getVisionClient();
      const [result] = await vision.safeSearchDetection(gcsUri);
      const safeSearch = result.safeSearchAnnotation;

      if (!safeSearch) {
        logger.log(`No safe search annotation for ${name}.`);
        return null;
      }

      const isAdult = safeSearch.adult === "LIKELY" || safeSearch.adult === "VERY_LIKELY";
      const isViolent = safeSearch.violence === "LIKELY" || safeSearch.violence === "VERY_LIKELY";

      if (isAdult || isViolent) {
        logger.warn(`Inappropriate image detected: ${name}. Deleting...`);
        const storageBucket = admin.storage().bucket(bucket);
        await storageBucket.file(name).delete();
      } else {
        logger.log(`Image ${name} is clean.`);
      }
      return null;
    } catch (error) {
      logger.error(`Error analyzing image ${name}:`, error);
      return null;
    }
});

// Export the Agora token generation function
export const generateAgoraToken = agoraTokenGenerator;

// Deletes a user's document and storage files when their auth account is deleted.
export const onUserDelete = onUserDeleted(async (event) => {
    const user = event.data;
    const userId = user.uid;
    logger.log(`Cleaning up data for user: ${userId}`);

    try {
        const db = admin.firestore();
        const bucket = admin.storage().bucket();

        // 1. Delete user document from Firestore.
        // This will also trigger the 'syncUserToAlgolia' function to remove the user from Algolia.
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.delete();
        logger.log(`Successfully deleted Firestore document for user: ${userId}`);

        // 2. Delete user profile pictures from Storage.
        const profilePicturesPath = `profilePictures/${userId}/`;
        await bucket.deleteFiles({ prefix: profilePicturesPath });
        logger.log(`Successfully deleted profile pictures for user: ${userId}`);

    } catch (error) {
        logger.error(`Error cleaning up data for user ${userId}:`, error);
    }
});

// --- START: Notification Functions ---

// Sends a notification when a new call is created.
export const sendCallNotification = onDocumentWritten("calls/{callId}", async (event) => {
    if (event.data.before.exists) return; // Only trigger on create
    if (!event.data.after.exists) return;
    
    const callData = event.data.after.data();
    if (!callData) return;

    const { callerId, receiverId, isVideo } = callData;
    if (!callerId || !receiverId) return;

    try {
        const [callerProfileSnap, receiverProfileSnap] = await Promise.all([
            admin.firestore().collection('users').doc(callerId).get(),
            admin.firestore().collection('users').doc(receiverId).get()
        ]);

        if (!callerProfileSnap.exists() || !receiverProfileSnap.exists()) {
            logger.log("Caller or receiver profile not found.");
            return;
        }

        const receiverToken = receiverProfileSnap.data()?.fcmToken;
        const callerName = callerProfileSnap.data()?.firstName || 'Quelqu\\'un';

        if (!receiverToken) {
            logger.log(`Receiver ${receiverId} does not have an FCM token.`);
            return;
        }

        const callType = isVideo ? "vidéo" : "audio";
        const payload = {
            token: receiverToken,
            data: {
                title: `Appel ${callType} entrant 📞`,
                body: `${callerName} vous appelle.`,
                type: 'INCOMING_CALL',
                callId: event.params.callId,
                callerName: callerName,
                isVideo: String(isVideo),
                channelId: event.params.callId,
            },
            android: {
                priority: 'high' as const
            }
        };

        await admin.messaging().send(payload);
        logger.log(`Call notification sent to ${receiverId}`);

    } catch (error) {
        logger.error(`Error processing call notification for ${receiverId}:`, error);
    }
});


// Sends a notification for a new message.
export const sendNewMessageNotification = onDocumentWritten("chats/{chatId}/messages/{messageId}", async (event) => {
    if (!event.data?.after.exists || event.data.before.exists) {
        return;
    }
    const messageData = event.data.after.data();
    if (!messageData) return;

    const { senderId, text, imageUrl, audioUrl } = messageData;
    const chatId = event.params.chatId;
    const participants = chatId.split('_');
    const receiverId = participants.find(p => p !== senderId);

    if (!receiverId) return;

     const [senderProfile, receiverProfile] = await Promise.all([
        admin.firestore().collection('users').doc(senderId).get(),
        admin.firestore().collection('users').doc(receiverId).get()
    ]);

    const receiverToken = receiverProfile.data()?.fcmToken;
    const senderName = senderProfile.data()?.firstName || 'Quelqu\\'un';

    if (!receiverToken) return;

    let messageBody = text;
    if(imageUrl) messageBody = '📷 a envoyé une photo.';
    if(audioUrl) messageBody = '🎤 a envoyé un message vocal.';

    const payload = {
        token: receiverToken,
        notification: {
            title: `Nouveau message de ${senderName}`,
            body: messageBody
        },
        data: {
            type: 'MESSAGE',
            chatId: chatId,
            senderId: senderId
        }
    };

     try {
        await admin.messaging().send(payload);
        logger.log(`Message notification sent to ${receiverId}`);
    } catch (error) {
        logger.error(`Error sending message notification to ${receiverId}:`, error);
    }
});

// Sends a notification for a new friend request.
export const sendFriendRequestNotification = onDocumentWritten("users/{userId}", async (event) => {
    if (!event.data?.before.exists || !event.data?.after.exists) {
        return; // Only interested in updates
    }
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const beforeFriends = beforeData.friends || [];
    const afterFriends = afterData.friends || [];

    // Find who added whom
    if (afterFriends.length > beforeFriends.length) {
        const newFriendId = afterFriends.find((id: string) => !beforeFriends.includes(id));
        const userIdWhoWasAdded = event.params.userId; // The document that was changed
        const userIdWhoAdded = newFriendId;
        
        if (!userIdWhoAdded) return;

        const [addedByProfile, addedProfile] = await Promise.all([
             admin.firestore().collection('users').doc(userIdWhoAdded).get(),
             admin.firestore().collection('users').doc(userIdWhoWasAdded).get()
        ]);

        const receiverToken = addedProfile.data()?.fcmToken;
        const senderName = addedByProfile.data()?.firstName || 'Quelqu\\'un';

        if (!receiverToken) return;

        const payload = {
            token: receiverToken,
            notification: {
                title: 'Nouvelle amitié ! 🎉',
                body: `${senderName} vous a ajouté(e) comme ami(e).`
            },
            data: {
                type: 'FRIEND_REQUEST',
                senderId: userIdWhoAdded
            }
        };

        try {
            await admin.messaging().send(payload);
            logger.log(`Friend request notification sent to ${userIdWhoWasAdded}`);
        } catch (error) {
            logger.error(`Error sending friend request notification to ${userIdWhoWasAdded}:`, error);
        }
    }
});

// --- END: Notification Functions ---
