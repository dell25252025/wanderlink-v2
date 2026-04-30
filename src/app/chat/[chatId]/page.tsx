'use client';

import { Suspense } from 'react';
import ChatClientPage from '../chat-client-page';
import { Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

function ChatPageContent({ params }: { params: { chatId: string } }) {
    const { chatId } = params;
    const [currentUser, loadingAuth] = useAuthState(auth);
    const router = useRouter();

    if (loadingAuth) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    }

    if (!chatId || !currentUser) {
        if (!loadingAuth) {
             router.push('/login');
        }
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    }

    const userIds = chatId.split('_');
    const otherUserId = userIds.find(id => id !== currentUser.uid);

    if (!otherUserId) {
        console.error("Could not determine other user from chat ID:", chatId);
        router.push('/inbox');
        return <div className="flex h-screen w-full items-center justify-center"><p>ID de chat invalide. Redirection...</p></div>;
    }

    return <ChatClientPage otherUserId={otherUserId} />;
}

export default function ChatWithIdPage({ params }: { params: { chatId: string } }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
        <ChatPageContent params={params} />
    </Suspense>
  );
}
