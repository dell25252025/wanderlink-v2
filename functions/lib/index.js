"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreated = exports.sendNewMessageNotification = exports.generateAgoraToken = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
// Importe et ré-exporte les fonctions individuellement pour un meilleur suivi
// Fonction pour le token Agora (existante)
const agora_1 = require("./agora");
Object.defineProperty(exports, "generateAgoraToken", { enumerable: true, get: function () { return agora_1.generateAgoraToken; } });
// Fonctions pour les notifications
const notifications_1 = require("./notifications");
Object.defineProperty(exports, "sendNewMessageNotification", { enumerable: true, get: function () { return notifications_1.sendNewMessageNotification; } });
Object.defineProperty(exports, "onNotificationCreated", { enumerable: true, get: function () { return notifications_1.onNotificationCreated; } });
//# sourceMappingURL=index.js.map