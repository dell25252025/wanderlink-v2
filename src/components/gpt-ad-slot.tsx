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
    console.log('[DIAGNOSTIC] GptAdSlot useEffect START.');
    console.log(`[DIAGNOSTIC] AD_SLOT_ID = "${AD_SLOT_ID}"`);
    console.log('[DIAGNOSTIC] Conteneur DOM à ce stade:', document.getElementById(AD_SLOT_ID));

    // 1. Vérification de l'état de GPT au montage
    const googletag = (window as any).googletag;
    console.log('[DIAGNOSTIC] window.googletag existe:', !!googletag);
    if (googletag) {
      console.log('[DIAGNOSTIC] window.googletag.apiReady:', googletag.apiReady);
      console.log('[DIAGNOSTIC] window.googletag.cmd existe:', !!googletag.cmd);
    }

    // Condition originale
    if (googletag && googletag.apiReady) {
      console.log('[DIAGNOSTIC] apiReady est TRUE. Exécution directe du cmd.push.');

      // 3. Vérification de l'exécution de la file
      console.log('[DIAGNOSTIC] Avant googletag.cmd.push()');
      googletag.cmd.push(() => {
        console.log('[DIAGNOSTIC] DANS cmd.push CALLBACK.');
        try {
          // 4. Logs dans le callback
          console.log('[DIAGNOSTIC] apiReady dans le callback:', googletag.apiReady);
          console.log('[DIAGNOSTIC] Conteneur DOM dans le callback:', document.getElementById(AD_SLOT_ID));

          console.log('[DIAGNOSTIC] Avant googletag.defineSlot()');
          adSlot.current = googletag.defineSlot('/6355419/Travel/Europe/France/Paris', [300, 250], AD_SLOT_ID);
          console.log('[DIAGNOSTIC] Résultat de defineSlot():', adSlot.current);

          // 5. Vérification du retour de defineSlot
          if (adSlot.current === null) {
            console.error('[DIAGNOSTIC] ERREUR: defineSlot() a retourné null. Vérifiez l\'ID du slot et l\'unicité.');
            return; // Arrêter si le slot n'est pas défini
          }
          
          // Ajout du service
          adSlot.current.addService(googletag.pubads());
          console.log('[DIAGNOSTIC] addService(pubads) appelé.');

          // 6. Logs autour des appels critiques
          console.log('[DIAGNOSTIC] Avant googletag.enableServices()');
          googletag.enableServices();
          console.log('[DIAGNOSTIC] Après googletag.enableServices()');

          console.log('[DIAGNOSTIC] Avant googletag.display()');
          googletag.display(AD_SLOT_ID);
          console.log('[DIAGNOSTIC] Après googletag.display()');

        } catch (e) {
          // 7. Capture d'exception
          console.error('[DIAGNOSTIC] EXCEPTION dans le callback cmd.push:', e);
        }
      });

    } else {
      console.warn('[DIAGNOSTIC] apiReady est FALSE ou googletag non défini. Le bloc cmd.push n\'est pas exécuté.');
    }

    // Fonction de nettoyage (originale, pour l'instant inchangée)
    return () => {
      console.log('[DIAGNOSTIC] GptAdSlot useEffect CLEANUP.');
      if (adSlot.current) {
        googletag.cmd.push(() => {
          console.log('[DIAGNOSTIC] CLEANUP: Destruction du slot.');
          googletag.destroySlots([adSlot.current]);
        });
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center p-2 w-full h-full min-h-[266px]">
      {/* Le conteneur où la publicité sera rendue par GPT */}
      <div id={AD_SLOT_ID} ref={adSlotRef} style={{ width: '300px', height: '250px' }} />
    </div>
  );
};

export default GptAdSlot;
