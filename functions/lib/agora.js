"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = void 0;
const functions = require("firebase-functions");
const agora_token_1 = require("agora-token");
const params_1 = require("firebase-functions/params");
// Define parameters for environment variables for Agora using the V1-compatible method
const AGORA_APP_ID = (0, params_1.defineString)("AGORA_APP_ID");
const AGORA_APP_CERTIFICATE = (0, params_1.defineString)("AGORA_APP_CERTIFICATE");
exports.generateAgoraToken = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { channelName, role, uid } = data;
    const appId = AGORA_APP_ID.value();
    const appCertificate = AGORA_APP_CERTIFICATE.value();
    // Validate inputs
    if (!channelName) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'channelName' argument.");
    }
    if (!appId || !appCertificate) {
        functions.logger.error("Agora App ID or Certificate is not configured in environment variables.");
        throw new functions.https.HttpsError("internal", "Agora configuration is missing on the server.");
    }
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    functions.logger.info(`Generating token for channel: ${channelName}, uid: ${uid}`);
    // Generate the token
    const token = agora_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role === 'publisher' ? agora_token_1.RtcRole.PUBLISHER : agora_token_1.RtcRole.SUBSCRIBER, privilegeExpiredTs, // Token expiration timestamp
    privilegeExpiredTs // Privilege expiration timestamp
    );
    return { token };
});
//# sourceMappingURL=agora.js.map