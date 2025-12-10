"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = void 0;
const functions = require("firebase-functions");
const agora_token_1 = require("agora-token"); // Corrected package
const AGORA_APP_ID = "c4847da35aea485784de6794409a2806";
const AGORA_APP_CERTIFICATE = "98e4c531d2a14a0d9e999baa71f6b71f";
exports.generateAgoraToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { channelName, role, uid } = data;
    if (!channelName) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'channelName' argument.");
    }
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    // CORRECTED: Added the 7th argument for privilege expiration
    const token = agora_token_1.RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role === 'publisher' ? agora_token_1.RtcRole.PUBLISHER : agora_token_1.RtcRole.SUBSCRIBER, privilegeExpiredTs, // Token expiration time
    privilegeExpiredTs // Privilege expiration time
    );
    return { token };
});
//# sourceMappingURL=agora.js.map