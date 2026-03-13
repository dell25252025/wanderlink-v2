'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PushNotifications, PushNotificationSchema } from "@capacitor/push-notifications";
import { Capacitor } from '@capacitor/core';

export default function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    // --- Listener pour la navigation custom interne (déjà présent) ---
    const handler = (event: Event) => {
      const chatId = (event as CustomEvent).detail;
      if (chatId) {
        console.log(`Custom event 'openChat' received for chat: ${chatId}`);
        router.push(`/chat/${chatId}`);
      }
    };
    window.addEventListener("openChat", handler);

    // --- Logique pour les notifications push, uniquement sur plateformes natives ---
    if (Capacitor.isNativePlatform()) {
      console.log("\uD83D\uDCF1 Initialisation du listener de notifications Push (plateforme native détectée).");
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("\uD83D\uDD14 [Capacitor Push] Notification reçue via le listener JS !");
          console.log("Titre:", notification.title);
          console.log("Message:", notification.body);
          console.log("Data:", JSON.stringify(notification.data, null, 2));
        }
      );
    }

    // --- Nettoyage des listeners ---
    return () => {
      window.removeEventListener("openChat", handler);
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [router]);

  return null; // Ce composant ne rend rien
}
