'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PushNotifications, PushNotificationSchema } from "@capacitor/push-notifications";

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

    // --- Listener pour les notifications push de Capacitor ---
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("\uD83D\uDD14 [Capacitor Push] Notification reçue via le listener JS !");
        console.log("Titre:", notification.title);
        console.log("Message:", notification.body);
        console.log("Data:", JSON.stringify(notification.data, null, 2));

        // C'est ici que nous ajouterons la logique de routage plus tard.
        // Par exemple :
        // if (notification.data.type === 'INCOMING_CALL') {
        //   // Lancer l'interface d'appel
        // } else if (notification.data.type === 'MESSAGE') {
        //   // Peut-être juste rafraîchir la liste des conversations
        // }
      }
    );

    // --- Nettoyage des listeners ---
    return () => {
      window.removeEventListener("openChat", handler);
      // Il est recommandé de nettoyer les listeners de Capacitor également
      // bien qu'ils soient généralement gérés par le cycle de vie du plugin.
      PushNotifications.removeAllListeners();
    };
  }, [router]);

  return null; // Ce composant ne rend rien
}
