'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    angular: any;
  }
}

const GptLoader = () => {
  useEffect(() => {
    if (document.getElementById('diagnostic-script-angular')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'diagnostic-script-angular';
    // Test avec un script neutre depuis un autre domaine Google
    script.src = 'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js';
    script.async = true;

    script.onload = () => {
      console.log('[B-10.5 DIAGNOSTIC] Script externe (AngularJS/Google CDN) chargé avec succès !');
      if ((window as any).angular) {
        console.log('[B-10.5 DIAGNOSTIC] window.angular est DÉFINI.');
      } else {
        console.log('[B-10.5 DIAGNOSTIC] window.angular est INDÉFINI malgré onload.');
      }
    };

    script.onerror = (event) => {
      console.error('[B-10.5 DIAGNOSTIC] Échec du chargement du script (AngularJS/Google CDN).', JSON.stringify(event));
    };

    document.head.appendChild(script);

  }, []);

  return null; 
};

export default GptLoader;
