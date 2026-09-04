'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    googletag?: any;
  }
}

const AdTestPage = () => {
  useEffect(() => {
    console.log('[B-10] AdTestPage useEffect triggered.');

    const executeGpt = () => {
      console.log('[B-10] Attempting to execute GPT commands.');
      
      window.googletag = window.googletag || { cmd: [] };
      const googletag = window.googletag;

      googletag.cmd.push(() => {
        try {
          console.log('[B-10] googletag.cmd function is executing.');
          
          console.log('[B-10] Defining ad slot...');
          googletag.defineSlot('/6355419/Travel/Europe', [300, 250], 'div-gpt-ad-1').addService(googletag.pubads());
          console.log('[B-10] Ad slot defined.');

          googletag.pubads().enableSingleRequest();
          googletag.enableServices();
          console.log('[B-10] Pubads services enabled.');

          googletag.display('div-gpt-ad-1');
          console.log('[B-10] googletag.display() called for div-gpt-ad-1.');

        } catch (e) {
          console.error('[B-10] An error occurred within googletag.cmd:', e);
        }
      });
    };

    if (window.googletag && window.googletag.apiReady) {
      console.log('[B-10] GPT API is ready on initial load.');
      executeGpt();
    } else {
      console.log('[B-10] GPT API not ready, will check again.');
      const interval = setInterval(() => {
        if (window.googletag && window.googletag.apiReady) {
          console.log('[B-10] GPT API became ready after polling.');
          clearInterval(interval);
          executeGpt();
        } else {
          console.log('[B-10] Polling... GPT not ready yet.');
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        console.error('[B-10] Timed out waiting for GPT API to become ready.');
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        if (window.googletag && window.googletag.cmd) {
            window.googletag.cmd.push(() => {
                console.log('[B-10] Cleaning up ad slots on unmount.');
                window.googletag.destroySlots();
            });
        }
      };
    }

    return () => {
        if (window.googletag && window.googletag.cmd) {
            window.googletag.cmd.push(() => {
                console.log('[B-10] Cleaning up ad slots on unmount.');
                window.googletag.destroySlots();
            });
        }
    };
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>B-10: GPT Inline Ad POC</h1>
      <p>This page attempts to load a 300x250 web ad from Google Ad Manager using a test ad unit.</p>
      
      <div id="div-gpt-ad-1" style={{ width: '300px', height: '250px', margin: '20px auto', border: '1px solid black' }}>
      </div>

      <p>If successful, a test ad will appear inside the bordered box above.</p>
      <p>The native banner should NOT be visible on this page (as per existing logic).</p>
    </div>
  );
};

export default AdTestPage;
