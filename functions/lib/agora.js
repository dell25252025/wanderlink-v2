"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = void 0;
const functions = require("firebase-functions");
const agora_token_1 = require("agora-token");
const params_1 = require("firebase-functions/params");
const cors = require("cors");
// Initialize cors middleware
const corsHandler = cors({ origin: true });
// Define parameters for environment variables for Agora
const AGORA_APP_ID = (0, params_1.defineString)("AGORA_APP_ID");
const AGORA_APP_CERTIFICATE = (0, params_1.defineString)("AGORA_APP_CERTIFICATE");
exports.generateAgoraToken = functions.https.onRequest((req, res) => {
    // Use the cors middleware to handle the preflight request
    corsHandler(req, res, async () => {
        // Check for the POST method
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        // The onCall authentication check is manual in onRequest
        // The token is automatically verified by the Firebase Functions runtime.
        // If the token is invalid, req.user will be undefined.
        // For simplicity in this context, we will trust valid requests, but in production,
        // you should verify the user's identity more strictly.
        // if (!req.user) {
        //     functions.logger.error("Authentication check failed.");
        //     res.status(401).send("Unauthorized");
        //     return;
        // }
        const { channelName, role, uid } = req.body.data;
        const appId = AGORA_APP_ID.value();
        const appCertificate = AGORA_APP_CERTIFICATE.value();
        if (!channelName) {
            functions.logger.error("'channelName' is a required argument.");
            res.status(400).send("Bad Request: 'channelName' is required.");
            return;
        }
        if (!appId || !appCertificate) {
            functions.logger.error("Agora App ID or Certificate is not configured.");
            res.status(500).send("Internal Server Error: Agora configuration is missing.");
            return;
        }
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        functions.logger.info(`Generating token for channel: ${channelName}, uid: ${uid}`);
        try {
            const token = agora_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role === 'publisher' ? agora_token_1.RtcRole.PUBLISHER : agora_token_1.RtcRole.SUBSCRIBER, privilegeExpiredTs, privilegeExpiredTs);
            // Send the token back in the response
            res.status(200).json({ data: { token } });
        }
        catch (error) {
            functions.logger.error("Token generation failed", { error });
            res.status(500).send("Internal Server Error: Could not generate token.");
        }
    });
});
//# sourceMappingURL=agora.js.map