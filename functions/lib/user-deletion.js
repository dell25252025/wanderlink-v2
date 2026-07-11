"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialise l'app admin si ce n'est pas déjà fait
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.database();
const firestore = admin.firestore();
/**
 * Étape 4 : Suppression des données RTDB et Firestore.
 */
exports.deleteUserAccount = functions.https.onCall(async (_, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "L'utilisateur doit être authentifié pour appeler cette fonction.");
    }
    const uid = context.auth.uid;
    functions.logger.log(`[ÉTAPE 4] Appel reçu pour la suppression du compte de l'UID: ${uid}`);
    try {
        // Étape 3: Suppression des données de la Realtime Database
        const rtdbRef = db.ref(`/status/${uid}`);
        await rtdbRef.remove();
        functions.logger.log(`[ÉTAPE 4] Données RTDB supprimées avec succès pour l'UID: ${uid}`);
        // Étape 4: Suppression du document utilisateur dans Firestore
        const firestoreRef = firestore.collection("users").doc(uid);
        await firestoreRef.delete();
        functions.logger.log(`[ÉTAPE 4] Document Firestore supprimé avec succès pour l'UID: ${uid}`);
        return { success: true, message: "Étape 4 réussie: Données RTDB et Firestore supprimées." };
    }
    catch (error) {
        functions.logger.error(`[ÉTAPE 4] Erreur lors de la suppression des données pour ${uid}`, error);
        throw new functions.https.HttpsError("internal", "Erreur lors de la suppression des données utilisateur.");
    }
});
//# sourceMappingURL=user-deletion.js.map