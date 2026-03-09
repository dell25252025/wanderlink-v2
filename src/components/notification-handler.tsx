'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: Event) => {
      const chatId = (event as CustomEvent).detail;
      if (chatId) {
        console.log(`Notification event received for chat: ${chatId}`);
        router.push(`/chat/${chatId}`);
      }
    };

    window.addEventListener("openChat", handler);

    return () => {
      window.removeEventListener("openChat", handler);
    };
  }, [router]);

  return null; // Ce composant ne rend rien
}
