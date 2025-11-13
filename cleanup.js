
const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, collection, getDocs, writeBatch } = require("firebase/firestore");
const algoliasearch = require("algoliasearch");

// --- CONFIGURATION ---
const ALGOLIA_APP_ID = "H38LS2Y5J2";
const ALGOLIA_ADMIN_KEY = "d537a54483a3036e38d689115f59636f"; 
const ALGOLIA_INDEX_NAME = "users";

const firebaseConfig = {
  apiKey: "AIzaSyCGC-3H86sqqgigM2H5bIE4e1bEmGnKJz0",
  authDomain: "wanderlink-c1a35.firebaseapp.com",
  projectId: "wanderlink-c1a35",
  storageBucket: "wanderlink-c1a35.appspot.com",
  messagingSenderId: "186522309970",
  appId: "1:186522309970:web:85d430fa8caa742a1b968b"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function cleanup() {
  try {
    // --- Nettoyage de Firestore ---
    console.log("Démarrage du nettoyage de Firestore...");
    const usersCollection = collection(db, "users");
    const querySnapshot = await getDocs(usersCollection);
    
    if (querySnapshot.empty) {
      console.log("La collection \"users\" de Firestore est déjà vide.");
    } else {
      const batch = writeBatch(db);
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ ${querySnapshot.size} utilisateurs supprimés de Firestore.`);
    }

    // --- Nettoyage d'Algolia ---
    console.log("\nDémarrage du nettoyage d'Algolia...");
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
        throw new Error("Les identifiants Admin d'Algolia ne sont pas configurés.");
    }
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    const index = client.initIndex(ALGOLIA_INDEX_NAME);
    
    const { nbHits } = await index.search("", { hitsPerPage: 0 });

    if (nbHits === 0) {
        console.log(`L'index \"${ALGOLIA_INDEX_NAME}\" d'Algolia est déjà vide.`);
    } else {
        await index.clearObjects();
        console.log(`✅ ${nbHits} objets supprimés de l'index \"${ALGOLIA_INDEX_NAME}\" d'Algolia.`);
    }

    console.log("\n🎉 Nettoyage terminé avec succès !");
    process.exit(0);

  } catch (error) {
    console.error("❌ Une erreur est survenue pendant le nettoyage:", error);
    process.exit(1);
  }
}

cleanup();
