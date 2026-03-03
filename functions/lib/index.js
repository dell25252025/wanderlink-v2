"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = exports.syncUserToAlgolia = exports.sendNewMessageNotificationV2 = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const algoliasearch_1 = require("algoliasearch");
// On importe la fonction agora à restaurer
const agora_1 = require("./agora");
Object.defineProperty(exports, "generateAgoraToken", { enumerable: true, get: function () { return agora_1.generateAgoraToken; } });
admin.initializeApp();
// --- Initialisation du client Algolia (Lazy Initialization) ---
// On déclare la variable sans l'initialiser.
let usersIndex;
// Fonction qui initialise le client seulement au premier appel.
function getAlgoliaIndex() {
    // Si l'index n'est pas encore initialisé...
    if (!usersIndex) {
        functions.logger.log("Initializing Algolia client for the first time...");
        const ALGOLIA_APP_ID = "H8QSO88UZ6";
        // On récupère la clé depuis la config au moment de l'exécution.
        const ALGOLIA_ADMIN_KEY = functions.config().algolia.key;
        if (!ALGOLIA_ADMIN_KEY) {
            // Si la clé n'est pas là, on lance une erreur claire.
            throw new functions.https.HttpsError('internal', "La clé d'administration Algolia n'est pas configurée.");
        }
        const ALGOLIA_INDEX_NAME = "users";
        const algoliaClient = (0, algoliasearch_1.default)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
        // On assigne l'index à la variable pour les prochains appels.
        usersIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    }
    return usersIndex;
}
// --- FIN Configuration Algolia ---
exports.sendNewMessageNotificationV2 = functions.region("europe-west1")
    .firestore.document("groupChats/{chatId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const chatId = context.params.chatId;
    const chatRef = admin.firestore().collection("groupChats").doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
        functions.logger.log("Chat document not found");
        return;
    }
    const chatData = chatDoc.data();
    if (!chatData) {
        functions.logger.log("Chat data is empty");
        return;
    }
    const recipientId = chatData.members.find((memberId) => memberId !== message.senderId);
    if (!recipientId) {
        functions.logger.log("Recipient not found");
        return;
    }
    const recipientTokenRef = admin
        .firestore()
        .collection("users")
        .doc(recipientId)
        .collection("tokens");
    const tokensSnapshot = await recipientTokenRef.get();
    if (tokensSnapshot.empty) {
        functions.logger.log("No tokens found for recipient");
        return;
    }
    const senderRef = await admin
        .firestore()
        .collection("users")
        .doc(message.senderId)
        .get();
    const senderData = senderRef.data();
    if (!senderData) {
        functions.logger.log("Sender data not found");
        return;
    }
    const payload = {
        notification: {
            title: `${senderData.firstName}`,
            body: message.text,
            sound: "default",
            badge: "1",
        },
        data: {
            chatId: chatId,
            recipientId: recipientId,
            senderId: message.senderId,
            senderName: senderData.firstName,
            type: "message",
        },
    };
    const tokens = tokensSnapshot.docs.map((doc) => doc.id);
    functions.logger.log("Tokens:", tokens);
    try {
        await admin.messaging().sendToDevice(tokens, payload);
        functions.logger.log("Notification sent successfully");
    }
    catch (error) {
        functions.logger.error("Error sending notification:", error);
    }
});
exports.syncUserToAlgolia = functions.region("europe-west1")
    .firestore.document("users/{userId}")
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    // On récupère l'index Algolia de manière sécurisée.
    const index = getAlgoliaIndex();
    if (!change.after.exists) {
        functions.logger.log(`User ${userId} deleted from Firestore. Removing from Algolia.`);
        try {
            await index.deleteObject(userId);
            functions.logger.log(`✅ Successfully removed user ${userId} from Algolia.`);
        }
        catch (error) {
            functions.logger.error(`❌ Error removing user ${userId} from Algolia:`, error);
        }
        return;
    }
    const userData = change.after.data();
    if (!userData) {
        functions.logger.log(`User data for ${userId} is empty. Skipping Algolia sync.`);
        return;
    }
    const record = {
        objectID: userId,
        uid: userId,
        firstName: userData.firstName || null,
        age: userData.age || null,
        gender: userData.gender || null,
        onboardingCompleted: userData.onboardingCompleted || false,
    };
    functions.logger.log(`Syncing user ${userId} to Algolia...`, { objectID: record.objectID, age: record.age, gender: record.gender });
    if (!record.onboardingCompleted) {
        functions.logger.log(`User ${userId} has not completed onboarding. Deleting from Algolia to hide from search.`);
        try {
            await index.deleteObject(userId);
        }
        catch (e) {
            // Ignorer l'erreur si l'objet n'existe pas
        }
        return;
    }
    try {
        await index.saveObject(record);
        functions.logger.log(`✅ Successfully synced user ${userId} to Algolia.`);
    }
    catch (error) {
        functions.logger.error(`❌ Error syncing user ${userId} to Algolia:`, error);
    }
});
//# sourceMappingURL=index.js.map