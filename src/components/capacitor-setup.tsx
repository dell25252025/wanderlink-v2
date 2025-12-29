
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Ce composant ne rend rien. Son seul but est d'initialiser les plugins
// au démarrage de l'application sur les plateformes natives.

const CapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Initialisation de Capacitor...');
      // Initialise le plugin Google Auth au démarrage
      // [CORRECTION] Utilisation du bon Web Client ID de votre projet Firebase
      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }
  }, []);

  return null; // Ce composant ne rend rien dans l'UI
};

export default CapacitorSetup;
