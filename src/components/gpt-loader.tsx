'use client';

import { useEffect } from 'react';

const GptLoader = () => {
  useEffect(() => {
    // Ne pas recréer le script s'il existe déjà
    if (document.getElementById('gpt-script-manual')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'gpt-script-manual';
    script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    script.async = true;

    script.onload = () => {
      console.log('[GPT-LOADER] GPT script loaded successfully (manual onload).');
    };

    script.onerror = (event) => {
      console.error('[GPT-LOADER] GPT script failed to load (manual onerror).', JSON.stringify(event));
    };

    document.head.appendChild(script);

  }, []);

  return null; 
};

export default GptLoader;
