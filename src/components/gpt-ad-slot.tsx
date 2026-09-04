'use client';

import { useEffect, useRef } from 'react';

// Unique ID pour le conteneur du slot publicitaire
const AD_SLOT_ID = 'div-gpt-ad-discover-inline';

/**
 * GptAdSlot est un composant client responsable de la définition et de l'affichage
 * d'un seul emplacement publicitaire Google Publisher Tag (GPT).
 * Il est conçu pour être inséré directement dans la grille des profils.
 */
const GptAdSlot = () => {
  const adSlotRef = useRef<HTMLDivElement>(null);
  const adSlot = useRef<any>(null); // Pour conserver la référence au slot défini

  useEffect(() => {
    // S'assurer que l'API GPT est chargée et prête (ce qui est géré par GptLoader dans le layout global)
    if ((window as any).googletag && (window as any).googletag.apiReady) {
      const googletag = (window as any).googletag;

      // Exécuter les commandes GPT
      googletag.cmd.push(() => {
        // Définir le slot publicitaire en utilisant le chemin et les dimensions de test
        adSlot.current = googletag.defineSlot('/6355419/Travel/Europe/France/Paris', [300, 250], AD_SLOT_ID)
          .addService(googletag.pubads());
        
        // Demander l'affichage de la publicité
        googletag.display(AD_SLOT_ID);
      });

      // Fonction de nettoyage pour détruire le slot lorsque le composant est démonté
      return () => {
        if (adSlot.current) {
          googletag.cmd.push(() => {
            // La destruction d'un slot spécifique est la meilleure pratique
            googletag.destroySlots([adSlot.current]);
          });
        }
      };
    }
  }, []);

  return (
    <div className="flex justify-center items-center p-2 w-full h-full min-h-[266px]">
      {/* Le conteneur où la publicité sera rendue par GPT */}
      <div id={AD_SLOT_ID} ref={adSlotRef} style={{ width: '300px', height: '250px' }} />
    </div>
  );
};

export default GptAdSlot;
