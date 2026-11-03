
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const actionCodeSettings = {
  url: `https://wanderlink-v2--wanderlink-c1a35.us-east4.hosted.app/`,
  handleCodeInApp: false,
};

export default function VerifyEmailPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isReloading, setIsReloading] = useState(false);

  // Redirection si l'utilisateur n'est pas connecté ou déjà vérifié
  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/signup');
    }
    if (currentUser?.emailVerified) {
      router.replace('/create-profile');
    }
  }, [currentUser, loading, router]);

  // Démarrage du sondage pour la vérification de l'e-mail
  useEffect(() => {
    if (!currentUser || currentUser.emailVerified) return;

    const intervalId = setInterval(async () => {
      if (isReloading) return;
      setIsReloading(true);
      try {
        await currentUser.reload();
        // La mise à jour de currentUser par onAuthStateChanged déclenchera le premier useEffect
      } catch (error) {
        console.error("Erreur lors de l'actualisation de l'utilisateur:", error);
      } finally {
        setIsReloading(false);
      }
    }, 5000); // Toutes les 5 secondes

    return () => clearInterval(intervalId);
  }, [currentUser, isReloading]);
  
  // Gestion du cooldown pour le renvoi d'e-mail
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = useCallback(async () => {
    if (!currentUser || resendCooldown > 0) return;
    setIsSending(true);
    try {
      await sendEmailVerification(currentUser, actionCodeSettings);
      toast({ title: 'E-mail renvoyé', description: "Veuillez vérifier à nouveau votre boîte de réception." });
      setResendCooldown(60); // Réinitialiser le cooldown
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Échec de l'envoi",
        description: "Une erreur s'est produite. Veuillez réessayer plus tard."
      });
    } finally {
      setIsSending(false);
    }
  }, [currentUser, resendCooldown, toast]);

  const handleSignOut = async () => {
    try {
        await signOut(auth);
        router.push('/signup');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de se déconnecter.' });
    }
  }

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
        <Button onClick={handleResendEmail} disabled={isSending || resendCooldown > 0}>
          {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer l'e-mail"}
        </Button>
        <p className="text-xs text-muted-foreground">Vous n'avez rien reçu ? Vérifiez votre dossier de spam.</p>
        <Button variant="link" onClick={handleSignOut}>Se connecter avec un autre compte</Button>
      </div>
    </div>
  );
}
