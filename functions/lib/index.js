"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.onNewMessage = exports.generateAgoraToken = void 0;
const admin = require("firebase-admin");
// Initialise l'application Firebase UNE SEULE FOIS.
admin.initializeApp();
// Importe et exporte la fonction de génération de token Agora.
// Aucune modification n'est apportée ici.
var agoraToken_1 = require("./agoraToken");
Object.defineProperty(exports, "generateAgoraToken", { enumerable: true, get: function () { return agoraToken_1.generateAgoraToken; } });
// Importe et exporte les fonctions de notification.
// C'est ici que nous allons développer en toute sécurité.
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "onNewMessage", { enumerable: true, get: function () { return notifications_1.onNewMessage; } });
Object.defineProperty(exports, "sendNotification", { enumerable: true, get: function () { return notifications_1.sendNotification; } });
//# sourceMappingURL=index.js.map