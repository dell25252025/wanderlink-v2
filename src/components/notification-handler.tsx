'use client'

import { useEffect, useState } from "react";
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

  // État pour la navigation différée afin de corriger la race condition
  const [pendingNotificationRoute, setPendingNotificationRoute] = useState<string | null>(null);

  // Ce useEffect gère la navigation différée en toute sécurité
  useEffect(() => {
    if (pendingNotificationRoute) {
      console.log(`[NotificationHandler] Exécution de la navigation différée vers : ${pendingNotificationRoute}`);
      router.push(pendingNotificationRoute);
      // Réinitialiser l'état pour éviter les re-navigations
      setPendingNotificationRoute(null);
    }
  }, [pendingNotificationRoute, router]);

  // useEffect principal pour configurer les listeners de Capacitor
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
            // Au lieu de naviguer directement, on met la route en attente
            console.log(`[NotificationHandler] Mise en attente de la navigation vers le chat: /chat/${chatId}`);
            setPendingNotificationRoute(`/chat/${chatId}`);
          }
          
          // On peut toujours utiliser le contexte si d'autres parties de l'app en ont besoin
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
