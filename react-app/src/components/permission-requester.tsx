
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { useToast } from '@/hooks/use-toast';
import { Permissions } from '@capacitor/permissions';

const PermissionRequester = () => {
  const { toast } = useToast();

  useEffect(() => {
    const requestPermissions = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Demande de permission pour la caméra
          await Camera.requestPermissions();

          // Demande de permission pour la géolocalisation
          await Geolocation.requestPermissions();
          
          // D'autres permissions peuvent être demandées ici si nécessaire,
          // par exemple pour les notifications push ou le microphone.

        } catch (error) {
          console.error('Erreur lors de la demande de permissions:', error);
          toast({
            variant: 'destructive',
            title: 'Erreur de permissions',
            description: 'Impossible de demander les autorisations nécessaires.',
          });
        }
      }
    };

    // On attend un court instant avant de demander pour s'assurer que l'UI est prête
    const timeoutId = setTimeout(requestPermissions, 1000);
    
    return () => clearTimeout(timeoutId);

  }, [toast]);

  return null; // Ce composant ne rend rien visuellement
};

export default PermissionRequester;
