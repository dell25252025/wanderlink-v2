'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext'; // Importer useAuth pour vérifier la session
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

enum Status {
  LOADING,
  SUCCESS,
  ERROR,
}

// Le composant interne qui utilise useSearchParams
function ActionHandler() {
  const { currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [errorMessage, setErrorMessage] = useState('Le lien est invalide ou a expiré.');

  useEffect(() => {
    const handleAction = async () => {
      const mode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');

      if (mode !== 'verifyEmail' || !oobCode) {
        setStatus(Status.ERROR);
        setErrorMessage('Paramètres de lien invalides.');
        return;
      }

      try {
        // Vérifier si le code est valide. Cela peut aussi récupérer des infos comme l'e-mail.
        await checkActionCode(auth, oobCode);

        // Appliquer le code. L'état d'authentification de l'utilisateur sera mis à jour.
        await applyActionCode(auth, oobCode);

        setStatus(Status.SUCCESS);

        // Attendre que le contexte d'authentification se mette à jour
        if (!authLoading) {
          // Si une session est active sur cet appareil, on actualise l'état de l'utilisateur
          if (auth.currentUser) {
            await auth.currentUser.reload();
            // Rediriger vers la création de profil pour terminer l'inscription
            router.push('/create-profile');
          }
          // Si aucune session n'est active, l'utilisateur restera sur cette page de succès
          // avec un bouton pour se connecter.
        }

      } catch (error: any) {
        console.error("Erreur lors de la vérification de l'e-mail :", error);
        if (error.code === 'auth/expired-action-code') {
          setErrorMessage('Le lien de vérification a expiré. Veuillez vous reconnecter pour en demander un nouveau.');
        } else if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('Le lien est invalide ou a déjà été utilisé.');
        }
        setStatus(Status.ERROR);
      }
    };

    handleAction();

  }, [searchParams, router, authLoading]); // `authLoading` garantit que nous attendons l'initialisation de la session

  if (status === Status.LOADING) {
    return (
      <>
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Vérification en cours...</p>
      </>
    );
  }

  if (status === Status.SUCCESS) {
    return (
      <>
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
          Votre adresse e-mail a été confirmée avec succès !
        </h2>
        {!currentUser && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Vous pouvez maintenant vous connecter pour finaliser votre profil.
          </p>
        )}
        <div className="mt-6">
          {currentUser ? (
             <p className="text-sm text-gray-500 dark:text-gray-400">Redirection en cours...</p>
          ) : (
            <Link href="/login" className="inline-block w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
              Se connecter pour continuer
            </Link>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Erreur de vérification</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {errorMessage}
      </p>
      <div className="mt-6">
        <Link href="/login" className="inline-block w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
          Retour à la connexion
        </Link>
      </div>
    </>
  );
}

// Le composant de page principal qui enveloppe le tout dans Suspense
export default function ActionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-center flex flex-col items-center">
        <Suspense fallback={
          <>
            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Chargement...</p>
          </>
        }>
          <ActionHandler />
        </Suspense>
      </div>
    </div>
  );
}
