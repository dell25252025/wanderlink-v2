"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = void 0;
const functions = require("firebase-functions");
const agora_token_1 = require("agora-token");
const params_1 = require("firebase-functions/params");
const cors = require("cors");
// Define parameters for environment variables for Agora
const AGORA_APP_ID = (0, params_1.defineString)("AGORA_APP_ID");
const AGORA_APP_CERTIFICATE = (0, params_1.defineString)("AGORA_APP_CERTIFICATE");
// Allowed origins for CORS
const allowedOrigins = [
    "https://wanderlink-v2--wanderlink-c1a35.us-east4.hosted.app",
    "http://localhost:3000",
    "capacitor://localhost",
    "http://localhost"
];
// Configure cors middleware with a custom origin function
const corsHandler = cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true, // Allow cookies to be sent
});
exports.generateAgoraToken = functions.https.onRequest((req, res) => {
    // Use the cors middleware to handle the request and preflight checks
    corsHandler(req, res, async () => {
        // The corsHandler will automatically handle OPTIONS requests.
        // We only need to handle the POST logic.
        if (req.method !== 'POST') {
            // The corsHandler should have already handled the OPTIONS preflight,
            // so if it's not POST, it's an invalid method.
            res.status(405).send('Method Not Allowed');
            return;
        }
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
            res.status(200).json({ data: { token } });
        }
        catch (error) {
            functions.logger.error("Token generation failed", { error });
            res.status(500).send("Internal Server Error: Could not generate token.");
        }
    });
});
//# sourceMappingURL=agora.js.map