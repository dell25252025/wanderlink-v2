"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialise l'app admin si ce n'est pas déjà fait
if (admin.apps.length === 0) {
    admin.initializeApp();
}
/**
 * Étape 2 : Cloud Function minimale pour la suppression de compte.
 * Log l'UID et retourne un succès, sans effectuer de suppression.
 */
exports.deleteUserAccount = functions.https.onCall(async (_, context) => {
    // S'assurer que la requête vient d'un utilisateur authentifié
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "L'utilisateur doit être authentifié pour appeler cette fonction.");
    }
    const uid = context.auth.uid;
    // Log minimal pour vérification
    functions.logger.log(`[ÉTAPE 2] Appel reçu pour la suppression du compte de l'UID: ${uid}`);
    // Ne supprime rien, retourne simplement un succès
    return { success: true, message: "La communication avec la fonction est réussie." };
});
//# sourceMappingURL=user-deletion.js.map