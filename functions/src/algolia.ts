
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import algoliasearch from 'algoliasearch';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';

// =========================================================================================
//                                        CONFIGURATION
// =========================================================================================

// CORRECTION : Utilisation des types QueryDocumentSnapshot pour correspondre aux retours des triggers Firestore.
export let onUserCreated: functions.CloudFunction<QueryDocumentSnapshot> | undefined;
export let onUserUpdated: functions.CloudFunction<functions.Change<QueryDocumentSnapshot>> | undefined;
export let onUserDeleted: functions.CloudFunction<admin.auth.UserRecord> | undefined;

let config;
try {
  config = functions.config().algolia;
} catch (e) {
  console.error("Could not retrieve functions.config().algolia", e);
}

// =========================================================================================
//                                 INITIALISATION D'ALGOLIA
// =========================================================================================

if (config && config.app_id && config.api_key) {
  
  console.log("Algolia config is valid. Initializing functions...");

  const client = algoliasearch(config.app_id, config.api_key);
  const index = client.initIndex('users');

  // =========================================================================================
  //                                FONCTION : onUserCreated
  // =========================================================================================
  onUserCreated = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
      const data = snap.data();
      const objectID = context.params.userId;

      console.log(`[Algolia] Indexing new user ${objectID}`);

      try {
        await index.saveObject({ objectID, ...data });
      } catch (error) {
        console.error(`[Algolia] Error indexing user ${objectID}:`, error);
      }
    });

  // =========================================================================================
  //                                FONCTION : onUserUpdated
  // =========================================================================================
  onUserUpdated = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
      const newData = change.after.data();
      const objectID = context.params.userId;

      console.log(`[Algolia] Re-indexing user ${objectID}`);

      try {
        await index.saveObject({ objectID, ...newData });
      } catch (error) {
        console.error(`[Algolia] Error re-indexing user ${objectID}:`, error);
      }
    });

  // =========================================================================================
  //                                FONCTION : onUserDeleted
  // =========================================================================================
  onUserDeleted = functions.auth.user()
    .onDelete(async (user) => {
      const objectID = user.uid;
      
      console.log(`[Algolia] Deleting user ${objectID} from index.`);

      try {
        await index.deleteObject(objectID);
      } catch (error) {
        console.error(`[Algolia] Error deleting user ${objectID} from index:`, error);
      }
    });

} else {
  // Si la configuration est invalide, on affiche un avertissement clair.
  console.warn(`
    ⚠️ Algolia configuration is MISSING or INCOMPLETE.
    Skipping initialization of Algolia sync functions.
    To fix this, run: firebase functions:config:set algolia.app_id="YOUR_APP_ID" algolia.api_key="YOUR_ADMIN_KEY"
  `);
}
