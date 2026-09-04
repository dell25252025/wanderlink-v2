'use client';

// Étape 1: Log immédiat à l'évaluation du fichier.
console.log('[DIAGNOSTIC-2] Le fichier gpt-ad-slot.tsx est en cours d\'évaluation.');

import { useEffect } from 'react';

const GptAdSlot = () => {
  // Étape 2: Log immédiat au rendu du composant.
  console.log('[DIAGNOSTIC-2] Le composant GptAdSlot est en cours de RENDU.');

  useEffect(() => {
    // Ce hook est maintenant aussi instrumenté.
    console.log('[DIAGNOSTIC-2] Le useEffect de GptAdSlot s\'exécute.');
  }, []);

  // Le rendu inclut maintenant une bordure de débogage TRES visible.
  return (
    <div style={{ 
      width: '100%', 
      minHeight: '250px', 
      border: '3px dashed red', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: 'red', 
      fontSize: '12px', 
      padding: '4px',
      boxSizing: 'border-box'
    }}>
      [DEBUG] Conteneur du Slot Publicitaire
    </div>
  );
};

export default GptAdSlot;
