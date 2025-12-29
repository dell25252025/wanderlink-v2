
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
      GoogleAuth.initialize({
        clientId: '866051543733-3vj8h0dt0p8f9cpep2c0amg12jjt80bs.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }
  }, []);

  return null; // Ce composant ne rend rien dans l'UI
};

export default CapacitorSetup;
