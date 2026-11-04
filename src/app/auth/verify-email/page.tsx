'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';

export default function VerifyEmailPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const isProcessingRef = useRef(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  // This `useEffect` is the core of the logic. It handles the initial state,
  // periodic checks, and checks on page visibility change.
  useEffect(() => {
    if (loading) {
      return;
    }
    if (!currentUser) {
      router.replace('/signup');
      return;
    }

    // isMounted is used to ensure async operations
    // do not attempt to update an unmounted component.
    let isMounted = true;

    const checkVerificationAndRedirect = async () => {
      // The lock and current user check prevent multiple executions.
      if (isProcessingRef.current || !auth.currentUser) return;

      isProcessingRef.current = true;
      const initialUID = auth.currentUser.uid;

      try {
        await auth.currentUser.reload();
        
        // After await, check that the component is still mounted
        // AND that the user is still the same before taking any action.
        if (isMounted && auth.currentUser && auth.currentUser.uid === initialUID && auth.currentUser.emailVerified) {
          router.replace('/create-profile');
        }
      } catch (error) {
        console.error("Error checking email verification status:", error);
      } finally {
        if (isMounted) {
          isProcessingRef.current = false;
        }
      }
    };

    // The initial check doesn't wait, it runs `reload` immediately.
    checkVerificationAndRedirect();

    // Add listeners for continuous checks.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        checkVerificationAndRedirect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = setInterval(checkVerificationAndRedirect, 5000);

    // Cleanup function to stop all processes.
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, loading, router]);

  // Cooldown timer management.
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!currentUser || resendCooldown > 0 || isProcessingRef.current) return;
    
    const actionCodeSettings = {
        // Corrected: The URL is now a raw string.
        url: 'https://wanderlink-v2--wanderlink-c1a35.us-east4.hosted.app/auth/verified',
        handleCodeInApp: false,
    };

    try {
        await sendEmailVerification(currentUser, actionCodeSettings);
        toast({ title: 'E-mail renvoyé', description: "Veuillez vérifier votre boîte de réception." });
        setResendCooldown(60);
    } catch (error) {
        toast({ variant: 'destructive', title: "Échec de l'envoi", description: "Une erreur s'est produite." });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/signup');
  };

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold">Vérifiez votre adresse e-mail</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Nous avons envoyé un lien de vérification à <strong>{currentUser.email}</strong>. Veuillez cliquer sur ce lien pour continuer.
      </p>
      <div className="mt-6 flex flex-col items-center gap-4">
        <Button onClick={handleResendEmail} disabled={isProcessingRef.current || resendCooldown > 0}>
          {isProcessingRef.current && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer l'e-mail"}
        </Button>
        {/* Corrected: The JSX has a proper closing tag. */}
        <p className="text-xs text-muted-foreground">Vous n'avez rien reçu ? Vérifiez votre dossier de spam.</p>
        <Button variant="link" onClick={handleSignOut}>Se connecter avec un autre compte</Button>
      </div>
    </div>
  );
}
