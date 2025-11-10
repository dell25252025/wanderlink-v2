"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateProfilePicture = exports.getAlgoliaConfig = exports.syncUserToAlgolia = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision_1 = require("@google-cloud/vision");
const algoliasearch_1 = require("algoliasearch");
admin.initializeApp();
// Initialize Algolia
const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
const algoliaClient = (0, algoliasearch_1.default)(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
const usersIndex = algoliaClient.initIndex("users");
const visionClient = new vision_1.ImageAnnotatorClient();
// This single function handles creations, updates, and deletions.
exports.syncUserToAlgolia = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
    const objectID = context.params.userId;
    // If the document does not exist, it has been deleted.
    if (!change.after.exists) {
        try {
            await usersIndex.deleteObject(objectID);
            functions.logger.log(`User ${objectID} deleted from Algolia.`);
        }
        catch (error) {
            functions.logger.error(`Error deleting user ${objectID} from Algolia:`, error);
        }
        return;
    }
    const newData = change.after.data();
    if (!newData) {
        functions.logger.warn(`No data found for user ${objectID} on write event.`);
        return;
    }
    // We don't want to index sensitive data. 
    // By destructuring, we create a new object 'rest' that excludes these fields.
    const { privateData, email, ...rest } = newData;
    const algoliaRecord = {
        objectID,
        ...rest,
    };
    // Add geolocation data for proximity search.
    if (newData.latitude && newData.longitude) {
        algoliaRecord._geoloc = {
            lat: newData.latitude,
            lng: newData.longitude,
        };
    }
    try {
        await usersIndex.saveObject(algoliaRecord);
        functions.logger.log(`User ${objectID} indexed in Algolia.`);
    }
    catch (error) {
        functions.logger.error(`Error indexing user ${objectID} in Algolia:`, error);
    }
});
// This function securely provides the frontend with the keys it needs.
exports.getAlgoliaConfig = functions.https.onCall((data, context) => {
    const appId = functions.config().algolia.app_id;
    const searchKey = functions.config().algolia.search_key;
    if (!appId || !searchKey) {
        throw new functions.https.HttpsError('internal', 'Algolia configuration is missing on the server.');
    }
    return {
        appId: appId,
        searchKey: searchKey,
    };
});
/**
 * Triggered when a new image is uploaded to the profilePictures/ directory.
 * It uses the Google Cloud Vision API to detect inappropriate content.
 * If the image is flagged as adult or violent, it is deleted from Storage.
 */
exports.moderateProfilePicture = functions.storage
    .object()
    .onFinalize(async (object) => {
    // We only want to moderate images in the profilePictures folder.
    if (!object.name?.startsWith("profilePictures/")) {
        return null;
    }
    if (object.contentType?.endsWith("/") || !object.contentType?.startsWith("image/")) {
        return null;
    }
    const bucketName = object.bucket;
    const filePath = object.name;
    const gcsUri = `gs://${bucketName}/${filePath}`;
    try {
        const [result] = await visionClient.safeSearchDetection(gcsUri);
        const safeSearch = result.safeSearchAnnotation;
        if (!safeSearch)
            return null;
        const isAdult = safeSearch.adult === "LIKELY" || safeSearch.adult === "VERY_LIKELY";
        const isViolent = safeSearch.violence === "LIKELY" || safeSearch.violence === "VERY_LIKELY";
        if (isAdult || isViolent) {
            functions.logger.warn(`Inappropriate image detected: ${filePath}. Deleting...`);
            const bucket = admin.storage().bucket(bucketName);
            await bucket.file(filePath).delete();
        }
        return null;
    }
    catch (error) {
        functions.logger.error(`Error analyzing image ${filePath}:`, error);
        return null;
    }
});
//# sourceMappingURL=index.js.map