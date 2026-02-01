
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

async function startBackfill() {
  const firestore = getFirestore();
  const backfillCollection = firestore.collection("_firestore-algolia-search");

  try {
    await backfillCollection.doc().create({
      collection: "users",
      // You can add other options here if needed, like a specific index name
    });
    console.log("✅ Backfill trigger created successfully. The extension will now start re-indexing the 'users' collection.");
  } catch (error) {
    console.error("❌ Error creating backfill trigger:", error);
  }
}

startBackfill();
