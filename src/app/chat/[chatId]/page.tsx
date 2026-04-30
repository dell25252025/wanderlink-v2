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

    // Affiche un loader tant que l'authentification est en cours, que l'utilisateur n'est pas encore chargé,
    // ou que le chatId de l'URL n'est pas encore disponible.
    // Cela évite la redirection prématurée et les crashs dus à un chatId indéfini.
    if (loadingAuth || !currentUser || !chatId) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    // A ce stade, nous sommes sûrs d'avoir un utilisateur connecté ET un chatId.
    const userIds = chatId.split('_');
    const otherUserId = userIds.find(id => id !== currentUser.uid);

    if (!otherUserId) {
        console.error("Impossible de déterminer l'autre utilisateur à partir de l'ID de chat:", chatId, "ID de l'utilisateur actuel:", currentUser.uid);
        router.push('/inbox'); // Redirection sécurisée vers la boîte de réception
        return <p>ID de chat invalide. Redirection...</p>;
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
