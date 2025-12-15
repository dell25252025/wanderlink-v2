'use client';

import { Suspense } from 'react';
import ChatPageContent from './chat-page-content';
import { Loader2 } from 'lucide-react';


export default function ChatPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
