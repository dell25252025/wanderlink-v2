
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Ce composant ne rend rien. Son seul but est d'initialiser les plugins Capacitor
// au démarrage de l'application sur les plateformes natives.
export default function CapacitorSetup() {
  useEffect(() => {
    // Vérifie si l'application s'exécute dans un contexte natif (iOS/Android)
    if (Capacitor.isNativePlatform()) {
      // Initialise le plugin GoogleAuth. Il lira automatiquement la configuration
      // depuis capacitor.config.ts. Cette opération est nécessaire avant tout appel à signIn.
      GoogleAuth.initialize();
    }
  }, []);

  return null; // Ne rend aucun élément visuel
}
