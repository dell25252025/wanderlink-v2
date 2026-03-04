
'use client';

import { useEffect } from 'react';
import { App, type PluginListenerHandle } from '@capacitor/app';
import { usePathname, useRouter } from 'next/navigation';

const BackButtonHandler = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let listenerHandle: PluginListenerHandle | null = null;

    // Cette fonction sera appelée lorsque l'écouteur sera activé.
    const addListener = async () => {
      listenerHandle = await App.addListener('backButton', (e) => {
        const exitPages = ['/', '/login'];

        if (exitPages.includes(pathname)) {
          App.exitApp();
        } else if (e.canGoBack) {
          window.history.back();
        } else {
          router.push('/');
        }
      });
    };

    // On s'assure que le code ne s'exécute que sur le client
    if (typeof window !== 'undefined') {
      addListener();
    }

    return () => {
      // On utilise la méthode remove() de l'écouteur pour le nettoyer
      listenerHandle?.remove();
    };
  }, [router, pathname]);

  return null; // Ce composant ne rend rien visuellement
};

export default BackButtonHandler;
