'use client';

import { useEffect } from "react";
import { PushNotifications, ActionPerformed, PushNotificationSchema } from "@capacitor/push-notifications";
import { Capacitor } from '@capacitor/core';
import { useNavigation } from "@/context/navigation-context";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from 'next/navigation';

export default function NotificationHandler() {
  const { setPendingRoute } = useNavigation();
  const { toast } = useToast();
  const router = useRouter();

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

      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          console.log("👉 [Push ACTION]", action);
          const data = action.notification.data;
          let route: string | null = null;

          if (data?.type === 'friend_request' && data.senderId) {
              route = `/profile?id=${data.senderId}`;
          } else if (data?.chatId) {
              route = `/chat/${data.chatId}`;
          }

          if (route) {
            console.log("[NotificationHandler] Route de navigation mise en attente:", route);
            setPendingRoute(route);
          }
        }
      );

      return () => {
        console.log("Suppression des listeners de notification push");
        PushNotifications.removeAllListeners().catch(e => console.error("Échec de la suppression des listeners", e));
      };
    }
  }, [setPendingRoute, toast, router]);

  return null;
}
