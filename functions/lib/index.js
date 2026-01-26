"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFriendRequestNotification = exports.sendNewMessageNotification = exports.sendCallNotification = exports.onUserDelete = exports.generateAgoraToken = exports.moderateProfilePicture = exports.getAlgoliaConfig = exports.syncUserToAlgolia = void 0;
const admin = require("firebase-admin");
const vision_1 = require("@google-cloud/vision");
const algoliasearch_1 = require("algoliasearch");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
// Import v2 functions
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const storage_1 = require("firebase-functions/v2/storage");
// Define parameters for environment variables
const params_1 = require("firebase-functions/params");
// Import your custom function
const agora_1 = require("./agora");
const ALGOLIA_APP_ID = (0, params_1.defineString)("ALGOLIA_APP_ID");
const ALGOLIA_ADMIN_KEY = (0, params_1.defineString)("ALGOLIA_ADMIN_KEY");
const ALGOLIA_SEARCH_KEY = (0, params_1.defineString)("ALGOLIA_SEARCH_KEY");
admin.initializeApp();
// Lazily initialize clients to avoid timeout issues on cold start
let algoliaClient = null;
let visionClient = null;
const getAlgoliaClient = () => {
    if (!algoliaClient) {
        const appId = ALGOLIA_APP_ID.value();
        const adminKey = ALGOLIA_ADMIN_KEY.value();
        if (!appId || !adminKey) {
            logger.error("Algolia App ID or Admin Key is not configured.");
            throw new Error("Algolia configuration is missing.");
        }
        algoliaClient = (0, algoliasearch_1.default)(appId, adminKey);
    }
    return algoliaClient;
};
const getVisionClient = () => {
    if (!visionClient) {
        visionClient = new vision_1.ImageAnnotatorClient();
    }
    return visionClient;
};
// This function handles creations, updates, and deletions.
exports.syncUserToAlgolia = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a, _b;
    const objectID = event.params.userId;
    const usersIndex = getAlgoliaClient().initIndex("users");
    const afterData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    // Case 1: Document deleted from Firestore OR onboarding is not complete
    if (!((_b = event.data) === null || _b === void 0 ? void 0 : _b.after.exists) || (afterData && afterData.onboardingCompleted !== true)) {
        try {
            await usersIndex.deleteObject(objectID);
            logger.log(`SUCCESS: User ${objectID} deleted or removed from Algolia index 'users'.`);
        }
        catch (error) {
            logger.warn(`Warning while deleting user ${objectID} from Algolia:`, error);
        }
        return;
    }
    // Case 2: Document exists and onboarding is complete.
    const newData = afterData;
    if (!newData) {
        logger.log(`No data for user ${objectID}, skipping index.`);
        return;
    }
    const algoliaRecord = {
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
    try {
        await usersIndex.saveObject(algoliaRecord);
        logger.log(`SUCCESS: User ${objectID} indexed in Algolia index 'users'.`);
    }
    catch (error) {
        logger.error(`FAILURE: Error indexing user ${objectID} in Algolia:`, error);
    }
});
exports.getAlgoliaConfig = (0, https_1.onCall)((request) => {
    const appId = ALGOLIA_APP_ID.value();
    const searchKey = ALGOLIA_SEARCH_KEY.value();
    if (!appId || !searchKey) {
        throw new https_1.HttpsError('internal', 'Algolia configuration is missing on the server.');
    }
    return { appId: appId, searchKey: searchKey };
});
exports.moderateProfilePicture = (0, storage_1.onObjectFinalized)(async (event) => {
    const { bucket, name, contentType } = event.data;
    if (!(name === null || name === void 0 ? void 0 : name.startsWith("profilePictures/")) || !contentType || !contentType.startsWith("image/")) {
        logger.log(`File ${name} is not an image to moderate. Ignoring.`);
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
        }
        else {
            logger.log(`Image ${name} is clean.`);
        }
        return null;
    }
    catch (error) {
        logger.error(`Error analyzing image ${name}:`, error);
        return null;
    }
});
exports.generateAgoraToken = agora_1.generateAgoraToken;
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
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
    }
    catch (error) {
        logger.error(`Error cleaning up data for user ${userId}:`, error);
    }
});
// --- START: Notification Functions ---
exports.sendCallNotification = (0, firestore_1.onDocumentWritten)("calls/{callId}", async (event) => {
    var _a, _b, _c;
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists) || event.data.before.exists)
        return;
    const callData = event.data.after.data();
    if (!callData)
        return;
    const { callerId, receiverId, isVideo } = callData;
    const [callerProfile, receiverProfile] = await Promise.all([
        admin.firestore().collection('users').doc(callerId).get(),
        admin.firestore().collection('users').doc(receiverId).get()
    ]);
    const receiverToken = (_b = receiverProfile.data()) === null || _b === void 0 ? void 0 : _b.fcmToken;
    const callerName = ((_c = callerProfile.data()) === null || _c === void 0 ? void 0 : _c.firstName) || 'Quelqu\'un';
    if (!receiverToken) {
        logger.log(`Receiver ${receiverId} does not have an FCM token.`);
        return;
    }
    const callType = isVideo ? "vidéo" : "audio";
    const payload = {
        token: receiverToken,
        notification: { title: `Appel ${callType} entrant 📞`, body: `${callerName} vous appelle.` },
        data: { type: 'VIDEO_CALL', callId: event.params.callId, callerName: callerName },
        android: { priority: 'high' }
    };
    try {
        await admin.messaging().send(payload);
        logger.log(`Call notification sent to ${receiverId}`);
    }
    catch (error) {
        logger.error(`Error sending call notification to ${receiverId}:`, error);
    }
});
exports.sendNewMessageNotification = (0, firestore_1.onDocumentWritten)("chats/{chatId}/messages/{messageId}", async (event) => {
    var _a, _b, _c;
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists) || event.data.before.exists)
        return;
    const messageData = event.data.after.data();
    if (!messageData)
        return;
    const { senderId, text, imageUrl, audioUrl } = messageData;
    const chatId = event.params.chatId;
    const participants = chatId.split('_');
    const receiverId = participants.find(p => p !== senderId);
    if (!receiverId)
        return;
    const [senderProfile, receiverProfile] = await Promise.all([
        admin.firestore().collection('users').doc(senderId).get(),
        admin.firestore().collection('users').doc(receiverId).get()
    ]);
    const receiverToken = (_b = receiverProfile.data()) === null || _b === void 0 ? void 0 : _b.fcmToken;
    const senderName = ((_c = senderProfile.data()) === null || _c === void 0 ? void 0 : _c.firstName) || 'Quelqu\'un';
    if (!receiverToken)
        return;
    let messageBody = text;
    if (imageUrl)
        messageBody = '📷 a envoyé une photo.';
    if (audioUrl)
        messageBody = '🎤 a envoyé un message vocal.';
    const payload = {
        token: receiverToken,
        notification: { title: `Nouveau message de ${senderName}`, body: messageBody },
        data: { type: 'MESSAGE', chatId: chatId, senderId: senderId }
    };
    try {
        await admin.messaging().send(payload);
        logger.log(`Message notification sent to ${receiverId}`);
    }
    catch (error) {
        logger.error(`Error sending message notification to ${receiverId}:`, error);
    }
});
exports.sendFriendRequestNotification = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a, _b, _c, _d;
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.before.exists) || !((_b = event.data) === null || _b === void 0 ? void 0 : _b.after.exists))
        return;
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    if (!beforeData || !afterData)
        return;
    const beforeFriends = beforeData.friends || [];
    const afterFriends = afterData.friends || [];
    if (afterFriends.length > beforeFriends.length) {
        const newFriendId = afterFriends.find((id) => !beforeFriends.includes(id));
        const userIdWhoWasAdded = event.params.userId;
        const userIdWhoAdded = newFriendId;
        if (!userIdWhoAdded)
            return;
        const [addedByProfile, addedProfile] = await Promise.all([
            admin.firestore().collection('users').doc(userIdWhoAdded).get(),
            admin.firestore().collection('users').doc(userIdWhoWasAdded).get()
        ]);
        const receiverToken = (_c = addedProfile.data()) === null || _c === void 0 ? void 0 : _c.fcmToken;
        const senderName = ((_d = addedByProfile.data()) === null || _d === void 0 ? void 0 : _d.firstName) || 'Quelqu\'un';
        if (!receiverToken)
            return;
        const payload = {
            token: receiverToken,
            notification: { title: 'Nouvelle amitié ! 🎉', body: `${senderName} vous a ajouté(e) comme ami(e).` },
            data: { type: 'FRIEND_REQUEST', senderId: userIdWhoAdded }
        };
        try {
            await admin.messaging().send(payload);
            logger.log(`Friend request notification sent to ${userIdWhoWasAdded}`);
        }
        catch (error) {
            logger.error(`Error sending friend request notification to ${userIdWhoWasAdded}:`, error);
        }
    }
});
// --- END: Notification Functions ---
//# sourceMappingURL=index.js.map