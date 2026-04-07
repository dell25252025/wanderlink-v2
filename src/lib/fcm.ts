import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications"; // Importation ajoutée
import { app } from "@/lib/firebase";

const db = getFirestore(app);

// Nouvelle fonction pour créer les canaux de notification
export const createNotificationChannels = async () => {
  // Les canaux ne sont nécessaires que sur Android
  if (Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: "messages", // L'ID que nous avons défini dans AndroidManifest.xml
        name: "Messages",
        description: "Notifications pour les nouveaux messages de chat",
        importance: 5, // 5 = Maximum
        visibility: 1, // 1 = Public
        sound: "default",
        vibration: true,
      });
      console.log("Le canal de notification 'messages' a été créé avec succès.");
    } catch (error) {
      console.error("Erreur lors de la création du canal de notification:", error);
    }
  }
};

export const initPushNotifications = async (userId: string | null) => {
  if (!userId) {
    console.log("Push notifications non initialisées: ID utilisateur manquant.");
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications non initialisées: Pas une plateforme native.");
    return;
  }

  try {
    // ÉTAPE 1 : Créer le canal avant de demander les permissions
    await createNotificationChannels();

    // Le reste de la logique...
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") {
      console.log("L'utilisateur n'a pas accordé les permissions pour les notifications.");
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token: Token) => {
      console.log(`Token FCM reçu: ${token.value}`);
      try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token.value)
        });
        console.log(`Token FCM sauvegardé pour l'utilisateur ${userId}`);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du token FCM:", error);
      }
    });

    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("Erreur lors de l'enregistrement pour les notifications:", error);
    });

  } catch (error) {
    console.error("Erreur lors de l'initialisation des notifications push:", error);
  }
};
