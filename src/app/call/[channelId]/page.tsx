'use client';

import dynamic from 'next/dynamic';

const CallClient = dynamic(() => import('./call-client'), {
  ssr: false,
});

interface CallPageProps {
  params: {
    channelId: string;
  };
}

export default function CallPage({ params }: CallPageProps) {
  return <CallClient channelId={params.channelId} />;
}
