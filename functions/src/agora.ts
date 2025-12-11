
import * as functions from "firebase-functions";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import { defineString } from "firebase-functions/params";

// Define parameters for environment variables for Agora
const AGORA_APP_ID = defineString("AGORA_APP_ID");
const AGORA_APP_CERTIFICATE = defineString("AGORA_APP_CERTIFICATE");

// Allowed origins for CORS
const allowedOrigins = [
    "https://wanderlink-v2--wanderlink-c1a35.us-east4.hosted.app",
    "http://localhost:3000",
    "capacitor://localhost",
    "http://localhost"
];

export const generateAgoraToken = functions.https.onRequest(async (req, res) => {
    const origin = req.headers.origin as string;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Respond to preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
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
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid,
            role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
            privilegeExpiredTs,
            privilegeExpiredTs
        );
        
        res.status(200).json({ data: { token } });

    } catch (error) {
        functions.logger.error("Token generation failed", { error });
        res.status(500).send("Internal Server Error: Could not generate token.");
    }
});
