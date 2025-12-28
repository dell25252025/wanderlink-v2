
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { updateUserProfile } from '@/lib/firebase-actions';

// Schéma de validation pour le formulaire d'onboarding
const onboardingSchema = z.object({
  intention: z.string().min(3, { message: 'Veuillez décrire votre intention en quelques mots.' }),
});

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Gérer l'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // Si aucun utilisateur n'est connecté, rediriger vers la page de login
        router.replace('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { intention: '' },
  });

  async function onSubmit(values: z.infer<typeof onboardingSchema>) {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non authentifié.' });
      return;
    }

    setIsLoading(true);
    try {
      const profileData = {
        ...values,
        profileComplete: true, // Marquer le profil comme complet
      };

      const result = await updateUserProfile(currentUser.uid, profileData);

      if (result.success) {
        toast({ title: 'Profil mis à jour !', description: 'Bienvenue sur WanderLink !' });
        router.push('/'); // Rediriger vers la page d'accueil
      } else {
        throw new Error(result.error || 'Une erreur est survenue lors de la mise à jour du profil.');
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
      toast({ variant: 'destructive', title: 'Erreur', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Presque prêt !</h1>
        <p className="text-muted-foreground text-center mb-8">Complétez votre profil pour commencer à explorer.</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="intention"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre intention de voyage</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Rencontrer des gens, découvrir des cultures..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Terminer mon profil
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
