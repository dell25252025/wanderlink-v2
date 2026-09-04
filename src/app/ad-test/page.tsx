'use client';

import { useEffect, useState, useRef } from 'react';

// B-12: Ce diagnostic vérifie à la fois la présence du tag SCRIPT dans le DOM
// et l\'initialisation de l\'API googletag.

const AdTestPage = () => {
  const [status, setStatus] = useState('Démarrage du diagnostic...');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[B-12 DIAGNOSTIC] Test B-12 démarré.');

    const performChecks = () => {
      const scriptElement = document.getElementById('gpt-script-manual');
      const gptApiReady = (window as any).googletag && (window as any).googletag.apiReady;

      // Log des états
      console.log(`[B-12 DIAGNOSTIC] Statut - Tag SCRIPT présent: ${!!scriptElement}, API GPT prête: ${!!gptApiReady}`);

      if (gptApiReady) {
        setStatus('✅ SUCCÈS : Le tag SCRIPT est présent et l\'API GPT est prête.');
        console.log('[B-12 DIAGNOSTIC] Le script a été exécuté avec succès.');
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else if (scriptElement) {
        setStatus('⚠️ Le tag SCRIPT est présent dans le DOM, mais l\'API GPT n\'est pas encore prête.');
      } else {
        setStatus('❌ Le tag SCRIPT n\'est pas encore présent dans le DOM.');
      }
    };

    intervalRef.current = setInterval(performChecks, 1000); // Vérification chaque seconde

    const timeoutId = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        const scriptElement = document.getElementById('gpt-script-manual');
        const gptApiReady = (window as any).googletag && (window as any).googletag.apiReady;
        if (!gptApiReady) {
            const finalState = `État final - Tag SCRIPT présent: ${!!scriptElement}, API GPT prête: ${!!gptApiReady}`;
            console.error(`[B-12 DIAGNOSTIC] Timeout après 15 secondes. ${finalState}`);
            setStatus(`❌ ÉCHEC : Timeout. ${finalState}`);
        }
      }
    }, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Diagnostic Publicitaire (Test B-12)</h1>
      <p>Ce test vérifie si le script GPT est injecté dans le DOM et s'il s'exécute correctement.</p>
      <hr />
      <p><b>Statut :</b> {status}</p>
    </div>
  );
};

export default AdTestPage;
