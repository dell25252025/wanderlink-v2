'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
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
    const authUnsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        console.log("[useRealtimeConversations] Utilisateur authentifié, récupération des conversations pour l'UID:", user.uid);
        const chatsRef = collection(db, 'chats');
        const q = query(
          chatsRef,
          where('participants', 'array-contains', user.uid),
          orderBy('lastMessage.timestamp', 'desc')
        );

        const dbUnsubscribe = onSnapshot(q, async (snapshot) => {
          console.log(`[useRealtimeConversations] ${snapshot.docs.length} conversations trouvées.`);
          setLoading(true);
          try {
            const convPromises = snapshot.docs.map(async (docData) => {
              const chat = docData.data();
              const otherUserId = chat.participants.find((p: string) => p !== user.uid);

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
                unreadCount: lastMessage?.read === false && lastMessage?.senderId !== user.uid ? 1 : 0,
              } as Conversation;
            });

            const resolvedConversations = (await Promise.all(convPromises)).filter(Boolean) as Conversation[];
            setConversations(resolvedConversations);
            setError(null);
          } catch (err) {
            console.error("[useRealtimeConversations] Erreur lors du traitement des conversations:", err);
            setError("Impossible de charger les conversations.");
          } finally {
            setLoading(false);
          }
        }, (err) => {
          console.error("[useRealtimeConversations] Erreur d'écouteur Firestore:", err);
          setError("Une erreur réseau est survenue.");
          setLoading(false);
        });

        return () => {
          console.log("[useRealtimeConversations] Nettoyage de l'écouteur de base de données.");
          dbUnsubscribe();
        };

      } else {
        console.log("[useRealtimeConversations] Aucun utilisateur authentifié.");
        setConversations([]);
        setLoading(false);
      }
    });

    return () => {
        console.log("[useRealtimeConversations] Nettoyage de l'écouteur d'authentification.");
        authUnsubscribe();
    };
  }, []);

  return { conversations, loading, error };
};
