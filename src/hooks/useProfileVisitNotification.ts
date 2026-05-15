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

export function useProfileVisitNotification(profileId: string | null, currentUser: User | null) {
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    // Condition 1: Le hook ne doit s'exécuter qu'une seule fois.
    if (hasExecutedRef.current) {
        // console.log('[Visit-Debug] Hook déjà exécuté. Arrêt.');
        return;
    }
    
    // Condition 2: S'assurer que toutes les données nécessaires sont présentes.
    if (!profileId || !currentUser?.uid) {
        // console.log('[Visit-Debug] Données manquantes (profileId ou currentUser). Arrêt.');
        return;
    }

    // Condition 3: Ne pas s'exécuter si l'utilisateur visite son propre profil.
    if (profileId === currentUser.uid) {
        // console.log('[Visit-Debug] Visite de son propre profil. Arrêt.');
        return;
    }

    hasExecutedRef.current = true;
    console.log(`[Visit-Debug] Démarrage du hook pour la visite du profil ${profileId} par ${currentUser.uid}`);

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

        console.log('[Visit-Debug] Recherche de la dernière visite...');
        const visitSnapshot = await getDocs(q);
        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

        if (!visitSnapshot.empty) {
          const lastVisit = visitSnapshot.docs[0].data();
          if (lastVisit.visitedAt > twentyFourHoursAgo) {
            console.log('[Visit-Debug] Visite récente trouvée (< 24h). Pas de nouvelle notification.');
            return; // Visite trop récente, on arrête ici.
          }
        }

        console.log('[Visit-Debug] Aucune visite récente. Création de la notification...');
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

        console.log('[Visit-Debug] Notification de visite créée avec succès !');

      } catch (error) {
        console.error('[Visit-Debug] Erreur lors de la création de la notification:', error);
      }
    };

    // Léger délai pour ne pas surcharger le rendu initial
    const timeoutId = setTimeout(recordVisit, 1500);
    return () => clearTimeout(timeoutId);

  }, [profileId, currentUser]);
}
