'use client';

import { useEffect } from "react";
import { PushNotifications, ActionPerformed, PushNotificationSchema } from "@capacitor/push-notifications";
import { Capacitor } from '@capacitor/core';
import { useNavigation } from "@/context/navigation-context";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from 'next/navigation';
import CallKit from "@/app/callkit"; // Importation de notre plugin

export default function NotificationHandler() {
  const { setPendingRoute } = useNavigation();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log("📱 Initialisation des listeners de notifications Push.");

      PushNotifications.addListener(
        "pushNotificationReceived",
        async (notification: PushNotificationSchema) => {
          console.log("🔔 [Push REÇUE en 1er plan]", notification);
          const { data, title, body } = notification;

          // NOUVELLE LOGIQUE D'APPEL
          if (data?.type === 'video_call' && data.channelId) {
            console.log("📞 Appel vidéo entrant détecté! Affichage de l'interface native.");
            try {
              await CallKit.showIncomingCall({
                callerName: data.senderName || "Quelqu'un",
                callerPhotoUrl: data.senderPhotoUrl || '',
                channelId: data.channelId
              });
            } catch (error) {
              console.error("Erreur lors de l'affichage de l'appel entrant:", error);
            }
            return; // On ne montre pas de toast standard pour un appel
          }
          // FIN DE LA NOUVELLE LOGIQUE

          const chatId = data?.chatId;
          toast({
            title: title || "Nouveau message",
            description: body,
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

          // Si c'est un appel, la sonnerie est déjà gérée nativement.
          // On pourrait vouloir naviguer vers l'écran d'appel si l'utilisateur appuie sur "Répondre",
          // mais pour l'instant, on laisse le natif s'en charger.
          if (data?.type === 'video_call') {
            console.log("Action sur une notification d'appel. Le natif gère.");
            return;
          }

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
