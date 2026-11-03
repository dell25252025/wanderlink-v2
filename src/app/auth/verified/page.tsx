
// src/app/auth/verified/page.tsx
import { CheckCircle } from 'lucide-react';

export default function EmailVerifiedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center dark:bg-gray-900">
      <div className="rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
        <div className="flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Vérification Réussie
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Votre adresse e-mail a été vérifiée avec succès. Vous pouvez maintenant fermer cette page et retourner dans l'application WanderLink.
          </p>
        </div>
      </div>
    </div>
  );
}
