'use client';

import { Suspense } from 'react';
import ChatClientPage from '../chat-client-page';
import { Loader2 } from 'lucide-react';

function ChatPageContent({ params }: { params: { chatId: string } }) {
    const { chatId } = params;

    if (!chatId) {
        return <div>Chat introuvable.</div>;
    }

    return <ChatClientPage otherUserId={chatId} />;
}

export default function ChatWithIdPage({ params }: { params: { chatId: string } }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
        <ChatPageContent params={params} />
    </Suspense>
  );
}
