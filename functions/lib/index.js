"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNewMessage = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "onNewMessage", { enumerable: true, get: function () { return notifications_1.onNewMessage; } });
//# sourceMappingURL=index.js.map