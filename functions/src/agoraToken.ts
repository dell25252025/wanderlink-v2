
import * as functions from "firebase-functions";
import { RtcTokenBuilder, RtcRole } from "agora-token";

const cors = require("cors")({ origin: true });

// --- Fonction pour les appels vidéo AGORA (avec CORS) ---
export const generateAgoraToken = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { channelName, uid } = request.body;

    if (!channelName || !uid) {
      response.status(400).send("channelName and uid are required.");
      return;
    }

    // Utilise la configuration sécurisée au lieu des clés en dur
    const APP_ID = functions.config().agora.app_id;
    const APP_CERTIFICATE = functions.config().agora.app_certificate;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
      const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        role,
        privilegeExpiredTs, // token expiration
        privilegeExpiredTs  // privilege expiration
      );
      console.log(`Generated Agora token for channel ${channelName} and uid ${uid}`);
      response.status(200).json({ token });
    } catch (error) {
      console.error("Error generating Agora token:", error);
      response.status(500).send("Error generating Agora token.");
    }
  });
});
