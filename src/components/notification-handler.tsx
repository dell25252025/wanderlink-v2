'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { notificationEvents } from "@/lib/notificationEvents";

export default function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    const handler = (chatId: string) => {
      console.log(`Notification event received for chat: ${chatId}`);
      router.push(`/chat/${chatId}`);
    };

    notificationEvents.on("openChat", handler);

    // Nettoyage de l'écouteur lors du démontage du composant
    return () => {
      notificationEvents.off("openChat", handler);
    };
  }, [router]); // Ajouter router comme dépendance

  return null; // Ce composant ne rend rien
}
