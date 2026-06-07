
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, PluginListenerHandle } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

export const createNotificationChannels = async () => {
  // This function is unchanged
  if (Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: "messages",
        name: "Messages",
        description: "Notifications pour les nouveaux messages de chat",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
      });
      console.log("Le canal de notification 'messages' a été créé avec succès.");
    } catch (error) {
      console.error("Erreur lors de la création du canal de notification:", error);
    }
  }
};

// MODIFIED: This function now returns a promise that resolves to a cleanup function.
export const initPushNotifications = async (userId: string): Promise<() => Promise<void>> => {
  if (!userId) {
    console.log("Push notifications not initialized: Missing user ID.");
    return async () => {};
  }
  
  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications not initialized: Not a native platform.");
    return async () => {};
  }

  try {
    await createNotificationChannels();

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") {
      console.log("User did not grant permissions for push notifications.");
      return async () => {};
    }

    await PushNotifications.register();

    let activeToken: string | null = null;
    const listeners: PluginListenerHandle[] = [];

    const regListener = await PushNotifications.addListener("registration", (token: Token) => {
      console.log(`Push registration success, token: ${token.value}`);
      activeToken = token.value;
      const userRef = doc(db, "users", userId);
      updateDoc(userRef, { fcmTokens: arrayUnion(token.value) })
        .then(() => console.log(`FCM token saved for user ${userId}`))
        .catch(error => console.error("Error saving FCM token:", error));
    });
    listeners.push(regListener);

    const errListener = await PushNotifications.addListener("registrationError", (error: any) => {
      console.error("Error on registration for push notifications:", error);
    });
    listeners.push(errListener);
    
    // This is the cleanup function that will be returned
    return async () => {
      console.log("Cleaning up push notifications...");
      
      // Remove listeners
      for (const listener of listeners) {
        await listener.remove();
      }
      
      if (activeToken) {
        try {
          const userRef = doc(db, "users", userId);
          // Remove the token from Firestore
          await updateDoc(userRef, { fcmTokens: arrayRemove(activeToken) });
          console.log(`FCM token removed for user ${userId}`);
        } catch (error) {
          console.error("Error removing FCM token on cleanup:", error);
        }
      }
    };

  } catch (error) {
    console.error("Error initializing push notifications:", error);
    return async () => {};
  }
};
