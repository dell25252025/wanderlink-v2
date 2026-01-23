
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
            await usersIndex.deleteObject(objectID);
            
            if (!event.data?.after.exists) {
                logger.log(`SUCCESS: User ${objectID} deleted from Algolia index 'users'.`);
            } else {
                logger.log(`INFO: Incomplete profile ${objectID} removed from Algolia index 'users'.`);
            }
        } catch (error) {
            logger.warn(`Warning while trying to delete user ${objectID} from Algolia index 'users':`, error);
        }
        return;
    }

    const newData = event.data.after.data();
    const algoliaRecord: any = {
        objectID,
        onboardingCompleted: true,
        firstName: newData.firstName || '',
        profilePictures: newData.profilePictures || [],
        isVerified: newData.isVerified || false,
        gender: newData.gender || null,
        age: typeof newData.age === 'number' ? newData.age : -1,
        location: newData.location || null,
        destination: newData.destination || 'Toutes',
        intention: newData.intention || null,
        travelStyle: newData.travelStyle || 'Tous',
        activities: newData.activities || 'Toutes',
    };

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

export const getAlgoliaConfig = onCall((request) => {
  const appId = ALGOLIA_APP_ID.value();
  const searchKey = ALGOLIA_SEARCH_KEY.value();

  if (!appId || !searchKey) {
      throw new HttpsError('internal', 'Algolia configuration is missing on the server.');
  }

  return { appId: appId, searchKey: searchKey };
});

export const moderateProfilePicture = onObjectFinalized(async (event) => {
    const { bucket, name, contentType } = event.data;

    if (!name?.startsWith("profilePictures/") || contentType?.endsWith("/") || !contentType?.startsWith("image/")) {
        return null;
    }

    const gcsUri = `gs://${bucket}/${name}`;

    try {
      const vision = getVisionClient();
      const [result] = await vision.safeSearchDetection(gcsUri);
      const safeSearch = result.safeSearchAnnotation;

      if (!safeSearch) {
        return null;
      }

      const isAdult = safeSearch.adult === "LIKELY" || safeSearch.adult === "VERY_LIKELY";
      const isViolent = safeSearch.violence === "LIKELY" || safeSearch.violence === "VERY_LIKELY";

      if (isAdult || isViolent) {
        logger.warn(`Inappropriate image detected: ${name}. Deleting...`);
        const storageBucket = admin.storage().bucket(bucket);
        await storageBucket.file(name).delete();
      }
      return null;
    } catch (error) {
      logger.error(`Error analyzing image ${name}:`, error);
      return null;
    }
});

export const generateAgoraToken = agoraTokenGenerator;

export const onUserDelete = onUserDeleted(async (event) => {
    const user = event.data;
    const userId = user.uid;
    logger.log(`Cleaning up data for user: ${userId}`);

    try {
        const db = admin.firestore();
        const bucket = admin.storage().bucket();
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.delete();
        logger.log(`Successfully deleted Firestore document for user: ${userId}`);
        const profilePicturesPath = `profilePictures/${userId}/`;
        await bucket.deleteFiles({ prefix: profilePicturesPath });
        logger.log(`Successfully deleted profile pictures for user: ${userId}`);
    } catch (error) {
        logger.error(`Error cleaning up data for user ${userId}:`, error);
    }
});

export const sendCallNotification = onDocumentWritten("calls/{callId}", async (event) => {
    
    if (!event.data?.after.exists && event.data?.before.exists) {
        const callData = event.data.before.data();
        if (!callData) return;
        const receiverId = callData.callerId === callData.receiverId ? callData.callerId : (callData.callerId === event.params.userId ? callData.receiverId : callData.callerId);
        const receiverProfileSnap = await admin.firestore().collection('users').doc(receiverId).get();
        const receiverToken = receiverProfileSnap.data()?.fcmToken;

        if (receiverToken) {
            const payload = { token: receiverToken, data: { type: 'CALL_ENDED', callId: event.params.callId } };
            await admin.messaging().send(payload).catch(e => logger.error(`Error sending CALL_ENDED notification:`, e));
        }
        return;
    }

    if (event.data?.after.exists && !event.data.before.exists) {
        const callData = event.data.after.data();
        if (!callData) return;

        const { callerId, receiverId, isVideo } = callData;
        if (!callerId || !receiverId) return;

        try {
            const [callerProfileSnap, receiverProfileSnap] = await Promise.all([
                admin.firestore().collection('users').doc(callerId).get(),
                admin.firestore().collection('users').doc(receiverId).get()
            ]);

            if (!callerProfileSnap.exists() || !receiverProfileSnap.exists()) return;

            const receiverToken = receiverProfileSnap.data()?.fcmToken;
            const callerName = callerProfileSnap.data()?.firstName || 'Quelqu\\'un';
            const channelName = event.params.callId;

            if (!receiverToken) return;

            const payload = {
                token: receiverToken,
                data: {
                    type: 'INCOMING_CALL',
                    callId: channelName,
                    channel: channelName,
                    callerId: callerId,
                    callerName: callerName,
                    isVideo: String(isVideo),
                },
                android: { priority: 'high' as const, ttl: 30000 },
            };

            await admin.messaging().send(payload);
        } catch (error) {
            logger.error(`Error processing call notification:`, error);
        }
    }
});

export const sendNewMessageNotification = onDocumentWritten("chats/{chatId}/messages/{messageId}", async (event) => {
    if (!event.data?.after.exists || event.data.before.exists) return;
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
    if (imageUrl) messageBody = '📷 a envoyé une photo.';
    if (audioUrl) messageBody = '🎤 a envoyé un message vocal.';

    const payload = {
        token: receiverToken,
        notification: { title: `Nouveau message de ${senderName}`, body: messageBody },
        data: { type: 'MESSAGE', chatId: chatId, senderId: senderId }
    };

    try {
        await admin.messaging().send(payload);
    } catch (error) {
        logger.error(`Error sending message notification:`, error);
    }
});

export const sendFriendRequestNotification = onDocumentWritten("users/{userId}", async (event) => {
    if (!event.data?.before.exists || !event.data?.after.exists) return;
    const beforeFriends = event.data.before.data().friends || [];
    const afterFriends = event.data.after.data().friends || [];

    if (afterFriends.length > beforeFriends.length) {
        const newFriendId = afterFriends.find((id: string) => !beforeFriends.includes(id));
        const userIdWhoWasAdded = event.params.userId;
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
            notification: { title: 'Nouvelle amitié ! 🎉', body: `${senderName} vous a ajouté(e) comme ami(e).` },
            data: { type: 'FRIEND_REQUEST', senderId: userIdWhoAdded }
        };

        try {
            await admin.messaging().send(payload);
        } catch (error) {
            logger.error(`Error sending friend request notification:`, error);
        }
    }
});
