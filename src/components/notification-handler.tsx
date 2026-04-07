'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PushNotifications, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";
import { Capacitor } from '@capacitor/core';
import { useNotification } from "@/context/NotificationContext";
import { useToast } from "@/hooks/use-toast"; // Import du hook de toast
import { ToastAction } from "@/components/ui/toast"; // Import du composant d'action

export default function NotificationHandler() {
  const router = useRouter();
  const { notification, setNotification } = useNotification();
  const { toast } = useToast(); // Récupération de la fonction toast

  // Ce useEffect gère la navigation lorsque le contexte est mis à jour
  useEffect(() => {
    if (notification?.chatId) {
      console.log(`[NotificationContext] Navigation vers le chat: ${notification.chatId}`);
      router.push(`/chat/${notification.chatId}`);
      setNotification(null); // Nettoyage après navigation
    }
  }, [notification, router, setNotification]);


  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log("📱 Initialisation des listeners de notifications Push.");

      // Listener pour les notifications reçues quand l'app est au PREMIER PLAN
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("🔔 [Push REÇUE en 1er plan]", notification);

          // Afficher un toast au lieu d'une notification système
          toast({
            title: notification.title || "Nouveau Message",
            description: notification.body,
            action: (
              <ToastAction
                altText="Aller au chat"
                onClick={() => setNotification({ chatId: notification.data.chatId })}
              >
                Voir
              </ToastAction>
            ),
          });
        }
      );

      // Listener pour l'action sur une notification (app en ARRIÈRE-PLAN ou TUÉE)
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          const data = action.notification.data;
          console.log("✅ [Push ACTION]", data);
          if (data.chatId) {
            setNotification({ chatId: data.chatId });
          }
        }
      );
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        console.log("Suppression de tous les listeners de notification.");
        PushNotifications.removeAllListeners();
      }
    };
  }, [setNotification, toast]); // Ajout de toast aux dépendances

  return null;
}
