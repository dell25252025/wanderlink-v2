'use client';

import Script from 'next/script';

const GptLoader = () => {
  return (
    <Script
      id="gpt-script"
      strategy="beforeInteractive"
      src="https://securepubads.g.doubleclick.net/pagead/js/gpt.js"
      onLoad={() => {
        console.log('[B-10 DIAGNOSTIC] GPT script loaded successfully (onLoad).');
      }}
      onError={(e) => {
        console.error('[B-10 DIAGNOSTIC] GPT script failed to load (onError).', e);
      }}
    />
  );
};

export default GptLoader;