
// Ce script est conçu pour être exécuté dans un environnement déjà authentifié
// auprès de Firebase, comme Firebase Studio ou Google Cloud Shell.

const admin = require('firebase-admin');

// Initialise l'SDK Admin. Il utilisera automatiquement les identifiants de l'environnement.
admin.initializeApp();

const db = admin.firestore();

async function backfillUsers() {
  const usersRef = db.collection('users');
  console.log('Récupération de tous les profils depuis Firestore...');

  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log('Aucun utilisateur trouvé. Aucune action nécessaire.');
    return;
  }

  console.log(`Trouvé ${snapshot.size} utilisateurs. Démarrage de la synchronisation initiale...`);

  // Nous utilisons une écriture par lot (batch) pour tout mettre à jour efficacement.
  const batch = db.batch();
  snapshot.forEach(doc => {
    // On ne met en file d'attente que les profils qui ont terminé l'onboarding
    if (doc.data().onboardingCompleted) {
        console.log(`- Mise en file d'attente de l'utilisateur ${doc.id} pour la synchronisation...`);
        // On effectue une mise à jour minimale pour déclencher la fonction onWrite.
        batch.update(doc.ref, {
            _backfillTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } else {
        console.log(`- L'utilisateur ${doc.id} a été ignoré (onboarding non terminé).`);
    }
  });

  await batch.commit();

  console.log('\n✅ Opération terminée.');
  console.log('La fonction "syncUserToAlgolia" va maintenant être déclenchée pour chaque utilisateur mis à jour.');
  console.log('Veuillez consulter les logs de vos Cloud Functions et votre index Algolia dans quelques instants.');
}

backfillUsers().catch(error => {
  console.error('❌ Une erreur est survenue durant le processus de backfill :', error);
});
