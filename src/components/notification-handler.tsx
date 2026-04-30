'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PushNotifications, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";
import { Capacitor } from '@capacitor/core';
import { useNotification } from "@/context/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export default function NotificationHandler() {
  const router = useRouter();
  const { setNotification } = useNotification(); 
  const { toast } = useToast();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log("📱 Initialisation des listeners de notifications Push.");

      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("🔔 [Push REÇUE en 1er plan]", notification);
          const chatId = notification.data?.chatId;
          toast({
            title: notification.title || "Nouveau message",
            description: notification.body,
            action: chatId ? (
              <ToastAction altText="Voir" onClick={() => router.push(`/chat/${chatId}`)}>
                Voir
              </ToastAction>
            ) : undefined,
          });
        }
      );

      const actionListener = PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          console.log("👉 [Push ACTION]", action);
          const chatId = action.notification.data?.chatId;

          if (chatId) {
            setTimeout(() => {
              console.log(`[NotificationHandler] Exécution de la navigation différée vers le chat: /chat/${chatId}`);
              router.push(`/chat/${chatId}`);
            }, 1000); // Délai de 1 seconde pour assurer l'initialisation
          }
          
          setNotification(action.notification.data); 
        }
      );

      return () => {
        console.log("Suppression des listeners de notification push");
        PushNotifications.removeAllListeners().catch(e => console.error("Échec de la suppression des listeners", e));
      };
    }
  }, [router, setNotification, toast]);

  return null;
}
