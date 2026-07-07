"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserStatusChanged = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Référence à la base de données Firestore
const db = admin.firestore();
/**
 * Déclenchée lors de la mise à jour du statut d'un utilisateur dans la Realtime Database.
 * Synchronise ce statut avec le document utilisateur correspondant dans Firestore.
 */
exports.onUserStatusChanged = functions.database
    .ref("/status/{uid}")
    .onUpdate(async (change, context) => {
    // Récupère la nouvelle valeur du statut depuis la Realtime Database
    const eventStatus = change.after.val();
    // Référence au document utilisateur dans Firestore
    const userDocRef = db.doc(`users/${context.params.uid}`);
    // Crée l'objet à mettre à jour dans Firestore
    const statusForFirestore = {
        isOnline: eventStatus.state === "online",
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Met à jour le document dans Firestore
    try {
        await userDocRef.update(statusForFirestore);
        console.log(`Statut de ${context.params.uid} mis à jour dans Firestore : ${statusForFirestore.isOnline}`);
    }
    catch (error) {
        console.error(`Erreur lors de la mise à jour de Firestore pour ${context.params.uid}`, error);
    }
});
//# sourceMappingURL=presence.js.map