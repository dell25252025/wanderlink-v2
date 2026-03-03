"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgoraToken = void 0;
const functions = require("firebase-functions");
const agora_token_1 = require("agora-token");
const cors = require("cors");
// On initialise le middleware CORS pour autoriser les requêtes depuis n'importe quelle origine.
const corsHandler = cors({ origin: true });
// On utilise la configuration des fonctions v1 (functions.config())
const agoraConfig = functions.config().agora;
exports.generateAgoraToken = functions.https.onRequest((req, res) => {
    // Le handler CORS s'occupe de la requête (y compris les requêtes pre-flight OPTIONS)
    corsHandler(req, res, async () => {
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
            // CORRECTION : La fonction attendait 7 arguments, j'en avais mis 6.
            const token = agora_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs, privilegeExpiredTs // Le 7ème argument manquant
            );
            res.status(200).json({ token });
        }
        catch (error) {
            functions.logger.error("La génération du jeton a échoué", { error });
            res.status(500).send("Erreur Interne: Impossible de générer le jeton.");
        }
    });
});
//# sourceMappingURL=agora.js.map