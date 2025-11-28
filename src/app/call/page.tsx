'use client';

import dynamic from 'next/dynamic';

// Dynamically import the CallClient component with SSR turned off.
// This prevents the component from being rendered on the server, where browser APIs like 'window' are not available.
const CallClient = dynamic(() => import('./call-client'), {
  ssr: false,
});

export default function CallPage() {
  return <CallClient />;
}
