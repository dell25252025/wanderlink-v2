import * as admin from "firebase-admin";

admin.initializeApp();

export { sendNewMessageNotification } from "./notifications";
export { generateAgoraToken } from "./agora";
