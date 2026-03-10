'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';

const CapacitorSetup = () => {
  const router = useRouter();

  useEffect(() => {
    // --- Initialisation des services Capacitor ---
    if (Capacitor.isNativePlatform()) {
      // Initialisation de Google Auth
      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      // Masquer le splash screen une fois l'app chargée
      SplashScreen.hide();
    }

    // --- Gestion de la redirection au clic sur une notification ---
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<{ chatId: string }>;
      const chatId = customEvent.detail.chatId;
      if (chatId) {
        console.log(`CapacitorSetup: Received openChat event for chat ${chatId}. Redirecting...`);
        router.push(`/chat/${chatId}`);
      }
    };

    window.addEventListener('openChat', handleOpenChat);

    // --- Nettoyage ---
    return () => {
      window.removeEventListener('openChat', handleOpenChat);
    };
  }, [router]); // Ajout de router comme dépendance du useEffect

  return null;
};

export default CapacitorSetup;
