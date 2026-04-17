"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = exports.sendNewMessageNotification = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "sendNewMessageNotification", { enumerable: true, get: function () { return notifications_1.sendNewMessageNotification; } });
var agora_1 = require("./agora");
Object.defineProperty(exports, "generateAgoraToken", { enumerable: true, get: function () { return agora_1.generateAgoraToken; } });
//# sourceMappingURL=index.js.map