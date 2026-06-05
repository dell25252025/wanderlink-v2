
import * as functions from "firebase-functions";
import algoliasearch from "algoliasearch";

// Initialise le client Algolia
const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex("users");

/**
 * Se déclenche à la création d'un nouveau document utilisateur dans Firestore.
 * Ajoute les données du profil à l'index Algolia.
 */
export const onUserCreated = functions.firestore
    .document("users/{userId}")
    .onCreate((snap, context) => {
      const data = snap.data();
      const objectID = context.params.userId;

      // Ajoute ou met à jour l'enregistrement dans Algolia
      return index.saveObject({
        objectID,
        ...data,
      }).then(() => {
        console.log("User created and indexed in Algolia:", objectID);
      }).catch((error) => {
        console.error("Error indexing user on creation:", objectID, error);
      });
    });

/**
 * Se déclenche à la mise à jour d'un document utilisateur dans Firestore.
 * Met à jour les données du profil dans l'index Algolia.
 */
export const onUserUpdated = functions.firestore
    .document("users/{userId}")
    .onUpdate((change, context) => {
      const newData = change.after.data();
      const objectID = context.params.userId;

      return index.saveObject({
        objectID,
        ...newData,
      }).then(() => {
        console.log("User updated and re-indexed in Algolia:", objectID);
      }).catch((error) => {
        console.error("Error re-indexing user on update:", objectID, error);
      });
    });

/**
 * Se déclenche à la suppression d'un utilisateur dans Firebase Authentication.
 * Supprime l'enregistrement correspondant de l'index Algolia.
 */
export const onUserDeleted = functions.auth.user()
    .onDelete((user) => {
      const objectID = user.uid;
      return index.deleteObject(objectID).then(() => {
        console.log("User deleted and removed from Algolia index:", objectID);
      }).catch((error) => {
        console.error("Error removing user from Algolia index:", objectID, error);
      });
    });
