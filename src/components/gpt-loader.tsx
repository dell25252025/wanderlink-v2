'use client';

import { useEffect } from 'react';

const GptLoader = () => {
  useEffect(() => {
    // Ne pas recréer le script s'il existe déjà pour éviter les doublons
    if (document.getElementById('gpt-script-manual')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'gpt-script-manual';
    script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    script.async = true;

    script.onload = () => {
      console.log('[B-10 MANUAL] GPT script loaded successfully (manual onload).');
    };

    script.onerror = (event) => {
      // Convertir l'événement en une chaîne pour un meilleur logging
      console.error('[B-10 MANUAL] GPT script failed to load (manual onerror).', JSON.stringify(event));
    };

    document.head.appendChild(script);

  }, []); // Le tableau vide assure que le script ne s'exécute qu'une seule fois par montage

  return null; // Ce composant n'affiche rien lui-même
};

export default GptLoader;
