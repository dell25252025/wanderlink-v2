"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = exports.moderateProfilePicture = exports.getAlgoliaConfig = exports.syncUserToAlgolia = void 0;
const admin = require("firebase-admin");
const vision_1 = require("@google-cloud/vision");
const algoliasearch_1 = require("algoliasearch");
const logger = require("firebase-functions/logger");
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
admin.initializeApp({ storageBucket: "wanderlink-c1a35.firebasestorage.app" });
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
exports.syncUserToAlgolia = (0, firestore_1.onDocumentWritten)({ document: "users/{userId}", region: "us-central1" }, async (event) => {
    var _a;
    const objectID = event.params.userId;
    const usersIndex = getAlgoliaClient().initIndex("users");
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists)) {
        try {
            await usersIndex.deleteObject(objectID);
            logger.log(`User ${objectID} deleted from Algolia.`);
        }
        catch (error) {
            logger.error(`Error deleting user ${objectID} from Algolia:`, error);
        }
        return;
    }
    const newData = event.data.after.data();
    if (!newData) {
        logger.warn(`No data found for user ${objectID} on write event.`);
        return;
    }
    const { privateData, email } = newData, rest = __rest(newData, ["privateData", "email"]);
    const algoliaRecord = Object.assign({ objectID }, rest);
    if (newData.latitude && newData.longitude) {
        algoliaRecord._geoloc = { lat: newData.latitude, lng: newData.longitude };
    }
    try {
        await usersIndex.saveObject(algoliaRecord);
        logger.log(`User ${objectID} indexed in Algolia.`);
    }
    catch (error) {
        logger.error(`Error indexing user ${objectID} in Algolia:`, error);
    }
});
// This function securely provides the frontend with the keys it needs.
exports.getAlgoliaConfig = (0, https_1.onCall)({ region: "us-central1" }, (request) => {
    const appId = ALGOLIA_APP_ID.value();
    const searchKey = ALGOLIA_SEARCH_KEY.value();
    if (!appId || !searchKey) {
        throw new https_1.HttpsError('internal', 'Algolia configuration is missing on the server.');
    }
    return { appId: appId, searchKey: searchKey };
});
/**
 * Triggered when a new image is uploaded, moderates it using Google Cloud Vision API.
 */
exports.moderateProfilePicture = (0, storage_1.onObjectFinalized)({ region: "us-central1", bucket: "wanderlink-c1a35.firebasestorage.app" }, async (event) => {
    const { bucket, name, contentType } = event.data;
    if (!(name === null || name === void 0 ? void 0 : name.startsWith("profilePictures/")) || (contentType === null || contentType === void 0 ? void 0 : contentType.endsWith("/")) || !(contentType === null || contentType === void 0 ? void 0 : contentType.startsWith("image/"))) {
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
// Export the Agora token generation function
exports.generateAgoraToken = agora_1.generateAgoraToken;
//# sourceMappingURL=index.js.map