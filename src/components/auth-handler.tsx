
'use client';

import { useEffect } from 'react';
import { handleGoogleRedirect } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserPresenceHandler } from './user-presence-handler';

export default function AuthHandler() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth(); // Get the authenticated user

  useEffect(() => {
    // This logic handles the redirect from Google Sign-In
    const processRedirect = async () => {
      // Check if the URL contains redirect parameters to avoid running this on every load
      const isRedirect = window.location.href.includes('code=') && window.location.href.includes('scope=');
      if (!isRedirect) return;

      const result = await handleGoogleRedirect();
      
      if (result?.success) {
        toast({ title: 'Connexion réussie !', description: 'Bienvenue sur WanderLink.' });
        
        if (result.isNewUser) {
          router.push('/create-profile');
        } else {
          router.push('/'); // Redirect to home if profile is already complete
        }
      } else if (result?.error) {
        toast({ variant: 'destructive', title: 'Erreur de connexion', description: result.error });
      }
    };

    processRedirect();
  }, [router, toast]);

  // Render UserPresenceHandler only when the user is logged in.
  // This ensures the presence hook runs with a valid user UID.
  return user ? <UserPresenceHandler /> : null;
}
