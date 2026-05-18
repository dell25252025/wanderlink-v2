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
  orderBy, 
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from 'firebase/auth';

/**
 * Hook isolé pour envoyer une notification de visite de profil.
 * N'a aucun effet sur le state ou le rendu du composant qui l'utilise.
 * @param profileId - L'ID du profil visité.
 * @param currentUser - L'objet de l'utilisateur actuellement connecté.
 */
export function useProfileVisitNotification(profileId: string | null, currentUser: User | null) {
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    // Conditions pour ne pas exécuter la logique
    if (hasExecutedRef.current || !profileId || !currentUser || profileId === currentUser.uid) {
      return;
    }
    
    // Marquer comme exécuté pour éviter les doublons (ex: React.StrictMode)
    hasExecutedRef.current = true;
    console.log('[Profile Visit] started');

    const recordVisitAndNotify = async () => {
      try {
        // Clé unique pour le document de visite
        const visitDocId = `${currentUser.uid}_${profileId}`;
        const visitDocRef = doc(db, 'profile_visits', visitDocId);
        
        const visitSnapshot = await getDocs(query(collection(db, 'profile_visits'), where('__name__', '==', visitDocId), limit(1)));

        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

        // Vérifier si une visite récente a déjà eu lieu
        if (!visitSnapshot.empty) {
          const lastVisit = visitSnapshot.docs[0].data();
          if (lastVisit.visitedAt > twentyFourHoursAgo) {
            // Visite trop récente, on ne fait rien.
            return;
          }
        }

        // Si aucune visite récente, on crée la notification et on enregistre la visite
        await addDoc(collection(db, `users/${profileId}/notifications`), {
          type: 'profile_visit',
          visitorId: currentUser.uid,
          visitorName: currentUser.displayName || 'Un utilisateur',
          visitorPhotoURL: currentUser.photoURL || null,
          createdAt: serverTimestamp(),
          read: false
        });

        await setDoc(visitDocRef, {
          visitorId: currentUser.uid,
          profileOwnerId: profileId,
          visitedAt: serverTimestamp(),
        });

        console.log('[Profile Visit] notification created');

      } catch (error) {
        console.error('[Profile Visit Error]', error);
      }
    };

    // Exécuter la logique
    recordVisitAndNotify();

  }, [profileId, currentUser]); // Dépendances du useEffect
}
