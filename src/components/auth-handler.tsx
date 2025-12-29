
'use client';

import { useEffect } from 'react';
import { handleGoogleRedirect } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AuthHandler() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const processRedirect = async () => {
      const result = await handleGoogleRedirect();
      
      if (result?.success) {
        toast({ title: 'Connexion réussie !', description: 'Bienvenue sur WanderLink.' });
        
        if (result.isNewUser) {
          router.push('/create-profile');
        } else {
          router.push('/'); // Redirige vers l'accueil si le profil est déjà complet
        }
      } else if (result?.error) {
        toast({ variant: 'destructive', title: 'Erreur de connexion', description: result.error });
      }
    };

    processRedirect();
  }, [router, toast]);

  return null; // Ce composant ne rend rien
}
