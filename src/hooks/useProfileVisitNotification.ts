'use client';

import { useEffect, useRef } from 'react';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from 'firebase/auth';

/**
 * Hook sécurisé pour enregistrer une visite de profil et envoyer une notification.
 * - Ne s'exécute qu'une seule fois par chargement de page.
 * - Vérifie toutes les conditions nécessaires.
 * - Limite les notifications à une par 24 heures par visiteur.
 * - N'entraîne aucun re-render.
 */
export function useProfileVisitNotification(profileId: string | null, currentUser: User | null) {
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    if (!profileId || !currentUser?.uid || profileId === currentUser.uid) return;

    hasExecutedRef.current = true;

    const recordVisit = async () => {
      try {
        const visitsRef = collection(db, 'profile_visits');
        const q = query(
          visitsRef,
          where('visitorId', '==', currentUser.uid),
          where('profileOwnerId', '==', profileId),
          orderBy('visitedAt', 'desc'),
          limit(1)
        );

        const visitSnapshot = await getDocs(q);
        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

        if (!visitSnapshot.empty) {
          const lastVisit = visitSnapshot.docs[0].data();
          if (lastVisit.visitedAt > twentyFourHoursAgo) {
            return; // Visite trop récente, on arrête ici.
          }
        }

        await addDoc(collection(db, `users/${profileId}/notifications`), {
          type: 'profile_visit',
          senderId: currentUser.uid, 
          senderName: currentUser.displayName || 'Un utilisateur',
          text: 'a visité votre profil',
          createdAt: serverTimestamp(),
          read: false,
        });
        
        await addDoc(visitsRef, {
            visitorId: currentUser.uid,
            profileOwnerId: profileId,
            visitedAt: serverTimestamp(),
        });

        console.log('[Profile Visit] Notification created successfully.');

      } catch (error) {
        console.error('[Profile Visit Error]', error);
      }
    };

    const timeoutId = setTimeout(recordVisit, 1500);
    return () => clearTimeout(timeoutId);

  }, [profileId, currentUser]);
}
