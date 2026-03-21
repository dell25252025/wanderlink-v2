"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = exports.onNewMessage = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "onNewMessage", { enumerable: true, get: function () { return notifications_1.onNewMessage; } });
var agora_1 = require("./agora");
Object.defineProperty(exports, "generateAgoraToken", { enumerable: true, get: function () { return agora_1.generateAgoraToken; } });
//# sourceMappingURL=index.js.map