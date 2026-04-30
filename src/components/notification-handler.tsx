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

      // Listener pour les notifications reçues lorsque l'application est au PREMIER PLAN
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("🔔 [Push REÇUE en 1er plan]", notification);
          
          const chatId = notification.data?.chatId;

          // Affiche un toast pour informer l'utilisateur
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

      // Listener pour lorsqu'une notification est CLiquée par l'utilisateur
      const actionListener = PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          console.log("👉 [Push ACTION]", action);
          const chatId = action.notification.data?.chatId;

          if (chatId) {
            // On introduit un délai pour laisser le temps à l'app de se charger
            setTimeout(() => {
              console.log(`[NotificationHandler] Exécution de la navigation différée vers le chat: /chat/${chatId}`);
              router.push(`/chat/${chatId}`);
            }, 500); // 500ms de délai
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

  return null; // Ce composant ne rend rien de visible
}
