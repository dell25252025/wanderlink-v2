
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User as UserIcon } from 'lucide-react';
import { getUserProfile } from '@/lib/firebase-actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- Types --- //
interface Chat {
  id: string;
  participants: string[];
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: any;
    read: boolean;
  } | null;
}

interface ParticipantProfile {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface EnrichedChat extends Chat {
  otherParticipant: ParticipantProfile | null;
}

// --- Composant d'une seule conversation --- //
const ChatListItem = ({ chat }: { chat: EnrichedChat }) => {
  if (!chat.otherParticipant) {
    return null; // Ne pas afficher si les détails du participant ne sont pas chargés
  }

  const lastMessageTimestamp = chat.lastMessage?.timestamp?.toDate();
  const isUnread = chat.lastMessage && !chat.lastMessage.read && chat.lastMessage.senderId !== auth.currentUser?.uid;

  return (
    <Link href={`/chat?id=${chat.id}`} className="block w-full">
      <div className="flex items-center space-x-4 p-3 hover:bg-muted/50 transition-colors rounded-lg">
        <Avatar className="h-12 w-12">
          <AvatarImage src={chat.otherParticipant.profilePicture || undefined} alt={chat.otherParticipant.name} />
          <AvatarFallback><UserIcon /></AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center">
            <p className="font-semibold truncate">{chat.otherParticipant.name}</p>
            {lastMessageTimestamp && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(lastMessageTimestamp, { addSuffix: true, locale: fr })}
              </p>
            )}
          </div>
          <div className="flex justify-between items-start">
            <p className={`text-sm truncate pr-2 ${isUnread ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
              {chat.lastMessage ? chat.lastMessage.text : 'Aucun message'}
            </p>
            {isUnread && (
               <span className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};


// --- Composant principal de la liste des conversations --- //
const InboxList = () => {
  const [user, loadingAuth] = useAuthState(auth);
  const [chats, setChats] = useState<EnrichedChat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => {
    if (!user) {
      if (!loadingAuth) setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const chatsRef = collection(db, 'chats');
    // **CORRECTION DE L'ERREUR D'INDEX**
    // La requête est simplifiée pour ne plus trier (orderBy). Le tri se fera côté client.
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      
      const enrichedChats = await Promise.all(chatData.map(async (chat) => {
        const otherParticipantId = chat.participants.find(p => p !== user.uid);
        let otherParticipant: ParticipantProfile | null = null;
        if (otherParticipantId) {
          try {
            const profile = await getUserProfile(otherParticipantId);
            otherParticipant = {
              id: otherParticipantId,
              name: profile?.firstName || 'Utilisateur inconnu',
              profilePicture: profile?.profilePictures?.[0] || null
            };
          } catch (error) {
            console.error("Could not fetch participant profile", error);
          }
        }
        return { ...chat, otherParticipant };
      }));

      // Tri des conversations côté client pour éviter l'erreur d'index
      const sortedChats = enrichedChats.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp?.toMillis() || 0;
        const timeB = b.lastMessage?.timestamp?.toMillis() || 0;
        return timeB - timeA; // Tri descendant
      });
      
      setChats(sortedChats);
      setLoadingChats(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [user, loadingAuth]);

  if (loadingAuth || loadingChats) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user) {
    return <p className="text-center text-muted-foreground">Veuillez vous connecter pour voir vos messages.</p>;
  }

  if (chats.length === 0) {
    return <p className="text-center text-muted-foreground">Aucune conversation pour le moment.</p>;
  }

  return (
    <div className="space-y-2">
      {chats.map(chat => (
        <ChatListItem key={chat.id} chat={chat} />
      ))}
    </div>
  );
};

export default InboxList;
