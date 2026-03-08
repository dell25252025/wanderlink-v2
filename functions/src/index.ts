
import * as admin from "firebase-admin";

// Initialise l'application Firebase UNE SEULE FOIS.
admin.initializeApp();

// Importe et exporte la fonction de génération de token Agora.
// Aucune modification n'est apportée ici.
export { generateAgoraToken } from "./agoraToken";

// Importe et exporte les fonctions de notification.
// C'est ici que nous allons développer en toute sécurité.
export { onNewMessage, sendNotification } from "./notifications";
