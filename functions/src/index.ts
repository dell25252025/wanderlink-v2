
import * as admin from "firebase-admin";

admin.initializeApp();

// Importe et ré-exporte les fonctions individuellement pour un meilleur suivi

// Fonction pour le token Agora (existante)
import { generateAgoraToken } from "./agora";
export { generateAgoraToken };

// Fonctions pour les notifications
import { sendNewMessageNotification, onNotificationCreated } from "./notifications";
export { sendNewMessageNotification, onNotificationCreated };

// Fonctions pour la synchronisation avec Algolia
import { onUserCreated, onUserUpdated, onUserDeleted } from "./algolia";
export { onUserCreated, onUserUpdated, onUserDeleted };

// NOUVEAU: Fonction pour la synchronisation de la présence
import { onUserStatusChanged } from "./presence";
export { onUserStatusChanged };
