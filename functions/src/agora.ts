
import * as functions from "firebase-functions";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

const AGORA_APP_ID = "c4847da35aea485784de6794409a2806";
const AGORA_APP_CERTIFICATE = "98e4c531d2a14a0d9e999baa71f6b71f";

export const generateAgoraToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { channelName, role, uid } = data;

    if (!channelName) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with a 'channelName' argument."
        );
    }
    
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
        privilegeExpiredTs
    );

    return { token };
});
