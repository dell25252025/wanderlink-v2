'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import type { DocumentData, Timestamp } from 'firebase/firestore';

export interface Conversation extends DocumentData {
  id: string;
  otherUserId: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  timestamp: Timestamp | null;
  isVerified: boolean;
  unreadCount: number;
}

export const useRealtimeConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const convPromises = snapshot.docs.map(async (docData) => {
          const chat = docData.data();
          const otherUserId = chat.participants.find((p: string) => p !== currentUser.uid);

          if (!otherUserId) return null;

          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (!userDoc.exists()) return null;

          const userData = userDoc.data();
          const lastMessage = chat.lastMessage;

          return {
            id: docData.id,
            otherUserId,
            name: userData.firstName || 'Utilisateur',
            avatarUrl: userData.profilePictures?.[0] || `https://picsum.photos/seed/${otherUserId}/200`,
            lastMessage: lastMessage?.text || 'Pas encore de message',
            timestamp: lastMessage?.timestamp || null,
            isVerified: userData.isVerified || false,
            unreadCount: lastMessage?.read === false && lastMessage?.senderId !== currentUser.uid ? 1 : 0,
          } as Conversation;
        });

        const resolvedConversations = (await Promise.all(convPromises)).filter(Boolean) as Conversation[];
        setConversations(resolvedConversations);
        setError(null);
      } catch (err) {
        console.error("Erreur lors de la récupération des conversations en temps réel:", err);
        setError("Impossible de charger les conversations.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Erreur d'écouteur Firestore:", err);
      setError("Une erreur réseau est survenue.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { conversations, loading, error };
};
