
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDocs, documentId, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserProfile } from '@/lib/firebase-actions'; // Import getUserProfile
import { DocumentData } from 'firebase/firestore';

// Interfaces
interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: any; // Firestore Timestamp
    senderId: string;
    read: boolean;
  };
}

interface EnrichedChat extends Chat {
  otherParticipant: {
    id: string;
    firstName?: string;
    profilePictures?: string[];
    isOnline?: boolean;
  };
}

// Component to render a single chat item
const ChatListItem = ({ chat }: { chat: EnrichedChat }) => {
  const router = useRouter();
  const [currentUser] = useAuthState(auth);

  const handleClick = () => {
    router.push(`/chat?id=${chat.otherParticipant.id}`);
  };

  if (!currentUser) return null;

  const { otherParticipant, lastMessage } = chat;
  const lastMessageTimestamp = lastMessage?.timestamp?.toDate();
  const isLastMessageUnread = lastMessage && lastMessage.senderId !== currentUser.uid && !lastMessage.read;

  return (
    <li 
      onClick={handleClick}
      className="flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={otherParticipant.profilePictures?.[0]} alt={otherParticipant.firstName} />
          <AvatarFallback>{otherParticipant.firstName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        {chat.otherParticipant.isOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <p className="font-semibold truncate">{otherParticipant.firstName || 'Utilisateur'}</p>
          {lastMessageTimestamp && (
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(lastMessageTimestamp, { addSuffix: true, locale: fr })}
            </p>
          )}
        </div>
        <div className="flex justify-between items-start">
            <p className={cn(
                "text-sm truncate w-11/12",
                isLastMessageUnread ? "text-foreground font-bold" : "text-muted-foreground"
            )}>
             {lastMessage?.text || 'Pas encore de messages'}
           </p>
           {isLastMessageUnread && (
             <div className="h-2 w-2 rounded-full bg-primary mt-1.5"></div>
           )}
        </div>
      </div>
    </li>
  );
};

// Main component to display the list of chats
export default function InboxList() {
  const [chats, setChats] = useState<EnrichedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser] = useAuthState(auth);
  const [currentUserProfile, setCurrentUserProfile] = useState<DocumentData | null>(null);

  // Effect to fetch current user's full profile
  useEffect(() => {
    if (currentUser) {
      getUserProfile(currentUser.uid).then(profile => {
        setCurrentUserProfile(profile);
      });
    }
  }, [currentUser]);


  // Effect to fetch and filter chats
  useEffect(() => {
    // Wait until we have the user and their profile (with block list)
    if (!currentUser || !currentUserProfile) {
        // If we have the user but not the profile yet, keep loading
        if(currentUser && !currentUserProfile) {
            setLoading(true);
        } else {
            setLoading(false);
        }
        return;
    }

    const blockedUserIds = new Set(currentUserProfile.blockedUsers || []);

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const baseChats: Chat[] = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Chat))
        .filter(chat => chat.participants.some(p => p !== currentUser.uid));
      
      if (baseChats.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const otherParticipantIds = baseChats
        .map(chat => chat.participants.find(p => p !== currentUser.uid))
        .filter((id): id is string => id !== undefined);

      if (otherParticipantIds.length === 0) {
          setChats([]);
          setLoading(false);
          return;
      }
      
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', otherParticipantIds)));
      const usersData = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));

      const enrichedChats: EnrichedChat[] = baseChats
        .map(chat => {
          const otherParticipantId = chat.participants.find(p => p !== currentUser.uid);
          const otherParticipantData = otherParticipantId ? usersData.get(otherParticipantId) : null;

          if (otherParticipantData) {
            return {
              ...chat,
              otherParticipant: {
                id: otherParticipantId!,
                firstName: otherParticipantData.firstName,
                profilePictures: otherParticipantData.profilePictures,
                isOnline: false, // Default value
              },
            };
          }
          return null;
        })
        .filter((chat): chat is EnrichedChat => chat !== null);

      // *** MODIFICATION: Filter out blocked users before setting state ***
      const filteredChats = enrichedChats.filter(chat => !blockedUserIds.has(chat.otherParticipant.id));

      setChats(filteredChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, currentUserProfile]); // Re-run when profile is loaded

   useEffect(() => {
    if (chats.length === 0) return;

    const participantIds = chats.map(chat => chat.otherParticipant.id);
    if(participantIds.length === 0) return;

    const unsubscribes = participantIds.map(id => {
      const userDocRef = doc(db, 'users', id);
      return onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
            const isOnline = userDoc.data().isOnline || false;
            setChats(prevChats => prevChats.map(chat => 
                chat.otherParticipant.id === id 
                ? { ...chat, otherParticipant: { ...chat.otherParticipant, isOnline } } 
                : chat
            ));
        }
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [chats.length]); // Depend on chats.length to re-trigger when chats are loaded


  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (chats.length === 0) {
    return <div className="text-center text-muted-foreground pt-10">Aucune conversation.</div>;
  }

  return (
    <ul className="divide-y divide-border">
      {chats.map(chat => (
        <ChatListItem key={chat.id} chat={chat} />
      ))}
    </ul>
  );
}
