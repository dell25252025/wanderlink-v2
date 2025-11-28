'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the CallClient component with SSR disabled.
// This prevents "ReferenceError: window is not defined" during build time,
// because Agora SDK tries to access window object which is missing on server.
const CallClient = dynamic(() => import('./call-client'), { 
  ssr: false,
  loading: () => <div className="flex h-screen w-full items-center justify-center bg-black text-white">Chargement du module d'appel...</div>
});

export default function CallPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black text-white">Chargement...</div>}>
      <CallClient />
    </Suspense>
  );
}
