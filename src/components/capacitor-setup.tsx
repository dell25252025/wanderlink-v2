
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Ce composant ne rend rien. Son seul but est d'initialiser les plugins Capacitor
// au démarrage de l'application sur les plateformes natives.
export default function CapacitorSetup() {
  useEffect(() => {
    // Ce hook est conservé pour de futures initialisations de plugins Capacitor,
    // mais il est actuellement vide car nous n'utilisons plus GoogleAuth.
    if (Capacitor.isNativePlatform()) {
      // Exemple: SplashScreen.hide();
    }
  }, []);

  return null; // Ne rend aucun élément visuel
}
