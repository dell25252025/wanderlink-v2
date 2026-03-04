'use client';

import { useSearchParams } from 'next/navigation';
import InboxPage from './inbox-page';
import ChatClientPage from './chat-client-page';

// A Suspense boundary is required because useSearchParams() suspends rendering.
export default function ChatPageContent() {
  const searchParams = useSearchParams();
  const otherUserId = searchParams.get('id');

  if (otherUserId) {
    return <ChatClientPage otherUserId={otherUserId} />;
  }

  return <InboxPage />;
}
