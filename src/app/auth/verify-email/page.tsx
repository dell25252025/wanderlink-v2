'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { MailCheck, LogOut } from 'lucide-react';

export default function VerifyEmailPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResendEmail = async () => {
    if (!currentUser || isSending) return;

    setIsSending(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(currentUser, actionCodeSettings);
      toast({
        title: 'E-mail envoyé',
        description: 'Un nouveau lien de confirmation a été envoyé. Pensez à vérifier votre dossier de courrier indésirable (spam).',
      });
    } catch (error: any) {
      console.error("Erreur lors du renvoi de l'e-mail :", error);
      let description = "Impossible de renvoyer l'e-mail. Veuillez réessayer plus tard.";
      if (error.code === 'auth/too-many-requests') {
        description = "Vous avez fait trop de demandes de renvoi. Veuillez réessayer dans quelques minutes.";
      }
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-center">
        <MailCheck className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
          Vérifiez votre adresse e-mail
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Nous avons envoyé un lien de confirmation à l'adresse <br />
          <strong className="font-medium text-gray-800 dark:text-gray-100">{currentUser?.email || 'votre e-mail'}</strong>.
        </p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Veuillez cliquer sur ce lien pour activer votre compte. Si vous ne trouvez pas l'e-mail, pensez à vérifier votre dossier de courrier indésirable (spam).
        </p>
        <div className="mt-6 space-y-4">
          <Button onClick={handleResendEmail} disabled={isSending} className="w-full">
            {isSending ? 'Envoi en cours...' : "Renvoyer l'e-mail"}
          </Button>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter et retourner à la connexion
          </Button>
        </div>
      </div>
    </div>
  );
}
