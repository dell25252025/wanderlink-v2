'use client';

import { useEffect } from 'react';

// Déclare googletag sur l'objet window pour TypeScript
declare global {
  interface Window {
    googletag?: any;
  }
}

const AdTestPage = () => {
  useEffect(() => {
    // Ensure googletag is available
    window.googletag = window.googletag || { cmd: [] };

    googletag.cmd.push(() => {
      // Define an ad slot using Google's official test ad unit path
      googletag.defineSlot('/6355419/Travel/Europe', [300, 250], 'div-gpt-ad-1').addService(googletag.pubads());

      // Enable the service and display the ad
      googletag.pubads().enableSingleRequest();
      googletag.enableServices();
      googletag.display('div-gpt-ad-1');
    });

    // Cleanup function to destroy the ad slot when the component unmounts
    return () => {
      googletag.cmd.push(() => {
        googletag.destroySlots();
      });
    };
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>B-10: GPT Inline Ad POC</h1>
      <p>This page attempts to load a 300x250 web ad from Google Ad Manager using a test ad unit.</p>
      
      {/* The div where the ad will be rendered */}
      <div id="div-gpt-ad-1" style={{ width: '300px', height: '250px', margin: '20px auto', border: '1px solid black' }}>
        {/* This div will be filled by GPT */}
      </div>

      <p>If successful, a test ad will appear inside the bordered box above.</p>
      <p>The native banner should NOT be visible on this page (as per existing logic).</p>
    </div>
  );
};

export default AdTestPage;
