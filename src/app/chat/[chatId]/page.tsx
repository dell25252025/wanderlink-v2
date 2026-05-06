'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ChatClientPage from '../chat-client-page';
import { Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

function ChatPageContent() {
    const params = useParams();
    const chatId = params.chatId as string;
    const [currentUser, loadingAuth] = useAuthState(auth);

    console.log("[ChatPageContent] rendu avec chatId depuis useParams:", chatId);
    console.log("[ChatPageContent] loadingAuth:", loadingAuth);
    console.log("[ChatPageContent] currentUser:", currentUser?.uid);

    if (loadingAuth) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin" />
                <p className="mt-4 text-center text-lg">Authentification en cours...</p>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center">
                <p className="text-center text-lg">Utilisateur non connecté. Vous allez être redirigé.</p>
            </div>
        );
    }

    if (!chatId) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center">
                 <Loader2 className="h-16 w-16 animate-spin" />
                 <p className="mt-4 text-center text-lg">En attente de l'identifiant du chat...</p>
            </div>
        );
    }

    let otherUserId = null;
    const parts = chatId.split("_");

    if (parts.length === 2) {
      otherUserId = parts[0] === currentUser.uid ? parts[1] : parts[0];
      console.log(`[ChatPageContent] otherUserId extrait: ${otherUserId}`);
    }

    if (!otherUserId) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <p className="text-center text-lg text-red-500">Erreur: Impossible d'identifier l'interlocuteur depuis l'ID de chat fourni: "{chatId}"</p>
            </div>
        );
    }
    
    return <ChatClientPage otherUserId={otherUserId} />;
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    );
}
