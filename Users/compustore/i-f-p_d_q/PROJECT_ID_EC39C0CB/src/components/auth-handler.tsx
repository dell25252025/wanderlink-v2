
'use client';

import { useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/lib/firebase-actions';
import { useOnboarding } from '@/context/OnboardingContext';

export default function AuthHandler() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { mode, setOverlayActive, setMode } = useOnboarding();

  useEffect(() => {
    if (loading) {
      return; // Ne rien faire tant que l'état d'authentification n'est pas chargé
    }

    if (!currentUser) {
      // Si l'utilisateur n'est pas connecté, s'assurer que l'overlay est désactivé
      if (mode !== null) {
          setOverlayActive(false);
          setMode(null);
      }
      return;
    }

    // L'utilisateur est connecté, on vérifie son profil
    const checkUserProfile = async () => {
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        
        // Si le profil existe ET est marqué comme complet
        if (userProfile?.profileComplete) {
            if(mode === 'google'){
                 // Redirection vers l'accueil si le profil est complet, même lors du flux Google
                router.push('/');
            }
        } else {
            // Le profil est incomplet ou n'existe pas, on redirige vers la création de profil
            // On le fait seulement si on est dans un flux d'onboarding pour éviter les redirections inutiles
            if (mode === 'google' || mode === 'email') {
                const query = new URLSearchParams();
                 if (mode === 'google') {
                    if (currentUser.displayName) query.append('firstName', currentUser.displayName.split(' ')[0]);
                    if (currentUser.photoURL) query.append('photoURL', currentUser.photoURL);
                }
                router.push(`/create-profile?${query.toString()}`);
            }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du profil utilisateur:", error);
        // En cas d'erreur, on désactive l'overlay pour débloquer l'UI
        setOverlayActive(false);
        setMode(null);
      }
    };

    checkUserProfile();

  }, [currentUser, loading, router, mode, setOverlayActive, setMode]);

  return null; // Ce composant ne rend rien
}
