
import * as admin from "firebase-admin";

admin.initializeApp();

// Importe et ré-exporte les fonctions individuellement pour un meilleur suivi

// Fonction pour le token Agora (existante)
import { generateAgoraToken } from "./agora";
export { generateAgoraToken };

// Fonctions pour les notifications
import { sendNewMessageNotification, onNotificationCreated } from "./notifications";
export { sendNewMessageNotification, onNotificationCreated };
