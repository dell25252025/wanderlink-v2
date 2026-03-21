import * as functions from "firebase-functions";
import { RtcTokenBuilder } from "agora-token";
import * as cors from "cors";

// Définir les origines autorisées
const allowedOrigins = [
  "https://wanderlink-v2--wanderlink-c1a35.us-east4.hosted.app", // Votre app déployée
  "http://localhost:3000", // Pour le développement local web
  "capacitor://localhost", // Pour Capacitor sur iOS
  "http://localhost",      // Pour Capacitor sur Android
];

// Configurer le middleware CORS avec une politique plus stricte
const corsHandler = cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (ex: Postman, apps mobiles natives)
    if (!origin) {
      return callback(null, true);
    }
    // Si l'origine est dans notre liste, on l'autorise
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Sinon, on la rejette
    const msg = `L'origine ${origin} n'est pas autorisée par la politique CORS.`;
    return callback(new Error(msg), false);
  },
});

// On utilise la configuration des fonctions v1 (functions.config())
const agoraConfig = functions.config().agora;

export const generateAgoraToken = functions.https.onRequest((req, res) => {
  // Le handler CORS s'occupe de la requête (y compris les requêtes pre-flight OPTIONS)
  corsHandler(req, res, async () => {
    // Si corsHandler a passé une erreur, la requête est déjà terminée.
    if (res.headersSent) {
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { channelName, role, uid } = req.body;
    
    // On vérifie que la configuration existe bien
    if (!agoraConfig || !agoraConfig.app_id || !agoraConfig.app_certificate) {
         functions.logger.error("L'App ID ou le Certificat Agora ne sont pas configurés dans functions.config().");
         res.status(500).send("Erreur Interne: La configuration d'Agora est manquante.");
         return;
    }

    const appId = agoraConfig.app_id;
    const appCertificate = agoraConfig.app_certificate;

    if (!channelName) {
        functions.logger.error("'channelName' est un argument requis.");
        res.status(400).send("Mauvaise Requête: 'channelName' est requis.");
        return;
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    functions.logger.info(`Génération du jeton pour le canal: ${channelName}, uid: ${uid}`);

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid,
            role,
            privilegeExpiredTs,
            privilegeExpiredTs
        );
        
        res.status(200).json({ token });

    } catch (error) {
        functions.logger.error("La génération du jeton a échoué", { error });
        res.status(500).send("Erreur Interne: Impossible de générer le jeton.");
    }
  });
});
