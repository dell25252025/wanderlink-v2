'use client';

import { useEffect, useRef, useState } from 'react';

const GptAdSlot = () => {
  // Ref pour conserver l'objet du slot publicitaire GPT, qui persiste entre les re-renders.
  const slotRef = useRef<any>(null);
  
  // Crée un ID stable et unique pour l'instance de ce composant.
  // Cela garantit qu'il n'y a pas de conflit si plusieurs GptAdSlot sont sur la même page.
  const [adContainerId] = useState(() => `div-gpt-ad-discover-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    // S'assure que googletag et sa file de commandes sont initialisés.
    const googletag = ((window as any).googletag = (window as any).googletag || { cmd: [] });

    // Pousse la logique de définition et d'affichage dans la file d'attente.
    // Elle s'exécutera de manière asynchrone dès que la bibliothèque GPT sera prête.
    googletag.cmd.push(() => {
      // 1. Définir le slot publicitaire.
      const slot = googletag
        .defineSlot('/6355419/Travel/Europe/France/Paris', [300, 250], adContainerId)
        .addService(googletag.pubads());
      
      // Conserve le slot défini dans notre ref pour un accès ultérieur (ex: nettoyage).
      slotRef.current = slot;
      
      // 2. Activer les services publicitaires.
      googletag.enableServices();
      
      // 3. Demander l'affichage de la publicité pour ce slot.
      googletag.display(adContainerId);
    });

    // La fonction de nettoyage retournée par useEffect.
    return () => {
      // S'assurer que le slot a bien été défini avant de tenter de le détruire.
      if (slotRef.current) {
        // Pousse la logique de destruction dans la file d'attente pour une exécution sûre.
        googletag.cmd.push(() => {
          googletag.destroySlots([slotRef.current]);
        });
      }
    };
  }, [adContainerId]); // L'ID est stable, mais il est bon de le déclarer comme dépendance.

  // Rendu du conteneur div que GPT ciblera.
  // L'ID doit correspondre à celui utilisé dans defineSlot.
  return (
    <div className="flex justify-center items-center p-2 w-full h-full min-h-[266px]">
      <div id={adContainerId} style={{ width: '300px', height: '250px' }} />
    </div>
  );
};

export default GptAdSlot;
