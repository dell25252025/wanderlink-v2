"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = exports.onUserStatusChanged = exports.onUserDeleted = exports.onUserUpdated = exports.onUserCreated = exports.onNotificationCreated = exports.sendNewMessageNotification = exports.generateAgoraToken = void 0;
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
// Fonctions pour la synchronisation avec Algolia
const algolia_1 = require("./algolia");
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return algolia_1.onUserCreated; } });
Object.defineProperty(exports, "onUserUpdated", { enumerable: true, get: function () { return algolia_1.onUserUpdated; } });
Object.defineProperty(exports, "onUserDeleted", { enumerable: true, get: function () { return algolia_1.onUserDeleted; } });
// Fonction pour la synchronisation de la présence
const presence_1 = require("./presence");
Object.defineProperty(exports, "onUserStatusChanged", { enumerable: true, get: function () { return presence_1.onUserStatusChanged; } });
// NOUVEAU: Fonction pour la suppression de compte
const user_deletion_1 = require("./user-deletion");
Object.defineProperty(exports, "deleteUserAccount", { enumerable: true, get: function () { return user_deletion_1.deleteUserAccount; } });
//# sourceMappingURL=index.js.map