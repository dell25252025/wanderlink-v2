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
/**
 * Étape 3 : Suppression des données RTDB.
 * Log l'UID, supprime les données de la RTDB et retourne un succès.
 */
exports.deleteUserAccount = functions.https.onCall(async (_, context) => {
    // S'assurer que la requête vient d'un utilisateur authentifié
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "L'utilisateur doit être authentifié pour appeler cette fonction.");
    }
    const uid = context.auth.uid;
    functions.logger.log(`[ÉTAPE 3] Appel reçu pour la suppression du compte de l'UID: ${uid}`);
    try {
        // Suppression des données de la Realtime Database (système de présence)
        const rtdbRef = db.ref(`/status/${uid}`);
        await rtdbRef.remove();
        functions.logger.log(`[ÉTAPE 3] Données RTDB supprimées avec succès pour l'UID: ${uid}`);
        return { success: true, message: "Étape 3 réussie: Données RTDB supprimées." };
    }
    catch (error) {
        functions.logger.error(`[ÉTAPE 3] Erreur lors de la suppression des données RTDB pour ${uid}`, error);
        throw new functions.https.HttpsError("internal", "Erreur lors de la suppression des données de présence.");
    }
});
//# sourceMappingURL=user-deletion.js.map