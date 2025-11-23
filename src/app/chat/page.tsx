
import { Suspense } from 'react';
import ChatClientPage from './chat-client-page';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function ChatPageContent() {
    const searchParams = useSearchParams();
    const otherUserId = searchParams.get('id');

    if (!otherUserId) {
        // Vous pouvez afficher un message d'erreur ou rediriger
        return <div>Utilisateur non spécifié.</div>;
    }

    return <ChatClientPage otherUserId={otherUserId} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
        <ChatPageContent />
    </Suspense>
  );
}
