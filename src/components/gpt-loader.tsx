'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    jQuery: any;
  }
}

const GptLoader = () => {
  useEffect(() => {
    // Évite d'ajouter le script plusieurs fois si le composant est remonté
    if (document.getElementById('diagnostic-script')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'diagnostic-script';
    // Remplacer la source par un script de test inoffensif (jQuery)
    script.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
    script.async = true;

    script.onload = () => {
      console.log('[B-10.4 DIAGNOSTIC] Script externe (jQuery) chargé avec succès !');
      // Vérifier si jQuery est maintenant disponible sur l'objet window
      if ((window as any).jQuery) {
        console.log('[B-10.4 DIAGNOSTIC] window.jQuery est DÉFINI.');
      } else {
        console.log('[B-10.4 DIAGNOSTIC] window.jQuery est INDÉFINI malgré onload.');
      }
    };

    script.onerror = (event) => {
      console.error('[B-10.4 DIAGNOSTIC] Échec du chargement du script externe (jQuery).', JSON.stringify(event));
    };

    document.head.appendChild(script);

  }, []);

  return null; 
};

export default GptLoader;
