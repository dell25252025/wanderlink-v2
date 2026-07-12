'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { SettingsHeader } from '@/components/settings/settings-header';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';

// Déconnexion Firebase
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function DeleteAccountPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    console.log("[CLIENT] Processus de suppression de compte initié.");

    try {
      // Étape 1: Appel de la Cloud Function pour supprimer les données backend
      const functions = getFunctions();
      const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
      const result = await deleteUserAccount();

      if (!result.data.success) {
        throw new Error("La fonction Cloud a indiqué un échec.");
      }
      
      console.log("[CLIENT] Suppression backend réussie. Déconnexion de l'appareil...");

      // Étape 2: Déconnexion du compte Google au niveau de l'appareil (natif)
      if (Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.signOut();
        console.log("[CLIENT] Déconnexion GoogleAuth (Capacitor) réussie.");
      }

      // Étape 3: Déconnexion de la session Firebase
      await firebaseSignOut(auth);
      console.log("[CLIENT] Déconnexion Firebase Auth réussie.");

      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé avec succès. Vous allez être redirigé.",
      });

      // Étape 4: Redirection vers la page de login
      router.push('/login');

    } catch (error) {
      console.error("[CLIENT] Erreur lors de la suppression du compte:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du compte.",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <SettingsHeader title="Supprimer le compte" />
      <main className="flex items-center justify-center min-h-[calc(100vh-3rem)] p-4 pt-12">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center items-center p-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg text-destructive pt-2">
              Action Irréversible
            </CardTitle>
            <CardDescription className="text-sm pt-1">
              La suppression de votre compte est définitive.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 p-4 pt-0">
            <p className="text-sm text-muted-foreground">
              Toutes vos données, y compris votre profil, vos messages et vos photos, seront supprimées de manière permanente. Cette action ne peut pas être annulée.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr(e) ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Votre compte et toutes vos données seront supprimés. Personne ne pourra récupérer ce contenu.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Oui, supprimer mon compte
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
