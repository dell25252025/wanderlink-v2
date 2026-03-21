import * as admin from "firebase-admin";

admin.initializeApp();

export { onNewMessage } from "./notifications";
export { generateAgoraToken } from "./agora";
