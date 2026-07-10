
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Triggered when a user's status changes in the Realtime Database.
 * Synchronizes this status with the corresponding user document in Firestore.
 * Includes a guard to prevent infinite loops by checking for existing values.
 */
export const onUserStatusChanged = functions.database
  .ref("/status/{uid}")
  .onUpdate(async (change, context) => {
    const uid = context.params.uid;
    const eventStatus = change.after.val();

    // The user's status document in Firestore
    const userDocRef = db.doc(`users/${uid}`);

    // The new status to write to Firestore
    const newStatus = {
      isOnline: eventStatus.state === "online",
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const userDoc = await userDocRef.get();

      // --- GUARD CLAUSE TO PREVENT THE INFINITE LOOP ---
      // If the document exists and the isOnline status is already what we intend to set,
      // then we stop the function to prevent a feedback loop.
      if (userDoc.exists && userDoc.data()?.isOnline === newStatus.isOnline) {
        functions.logger.log(`No status change needed for UID: ${uid}. Execution stopped to prevent loop.`);
        return null; // Stop the function execution
      }

      // If the status is different, or the document doesn't exist, update it.
      // Using `set` with `merge: true` is safer as it creates the doc if it's missing.
      await userDocRef.set(newStatus, { merge: true });
      functions.logger.log(`Status for ${uid} updated to ${newStatus.isOnline ? 'online' : 'offline'} in Firestore.`);
      return null;

    } catch (error) {
      functions.logger.error(`Error updating Firestore for UID: ${uid}`, error);
      return null;
    }
  });
