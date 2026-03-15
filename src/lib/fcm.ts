import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token } from "@capacitor/push-notifications";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

export const initPushNotifications = async (userId: string | null) => {
  if (!userId) {
    console.log("Push notifications not initialized: No user ID provided.");
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications not initialized: Not a native platform.");
    return;
  }

  try {
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") {
      console.log("User did not grant push notification permissions.");
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token: Token) => {
      console.log(`FCM Token received: ${token.value}`);
      try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token.value)
        });
        console.log(`FCM token successfully saved for user ${userId}`);
      } catch (error) {
        console.error("Error saving FCM token to Firestore:", error);
      }
    });

    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("Error during push notification registration:", error);
    });

  } catch (error) {
    console.error("Error initializing push notifications:", error);
  }
};
