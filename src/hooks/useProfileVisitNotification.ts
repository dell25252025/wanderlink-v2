'use client';

import { useEffect, useRef } from 'react';
import { 
  addDoc, 
  collection, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from 'firebase/auth';

/**
 * Hook isolé pour envoyer une notification de visite de profil à chaque visite.
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
    
    // Marquer comme exécuté pour éviter les doublons dans le même rendu (ex: React.StrictMode)
    hasExecutedRef.current = true;
    console.log('[Profile Visit] Hook triggered for every visit.');

    const createNotification = async () => {
      try {
        // Crée la notification à chaque fois.
        await addDoc(collection(db, `users/${profileId}/notifications`), {
          type: 'profile_visit',
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Un utilisateur',
          senderPhotoURL: currentUser.photoURL || null,
          text: "a visité votre profil 👀", // Champ de texte standardisé
          createdAt: serverTimestamp(),
          read: false
        });

        console.log('[Profile Visit] Notification created successfully.');

      } catch (error) {
        console.error('[Profile Visit Error]', error);
      }
    };

    // Exécuter la logique
    createNotification();

  }, [profileId, currentUser]); // Dépendances du useEffect
}
