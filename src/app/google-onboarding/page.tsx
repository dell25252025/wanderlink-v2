
"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { updateUserProfile } from '@/lib/firebase-actions';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WanderlinkHeader from '@/components/wanderlink-header';

export default function GoogleOnboardingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [intention, setIntention] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Only request permissions if it's a native platform
        if (Capacitor.isNativePlatform()) {
          requestPermissions();
        }
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const requestPermissions = async () => {
    try {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      await Geolocation.requestPermissions();
    } catch (error) {
      console.error("Erreur de demande de permissions :", error);
      toast({
        variant: 'destructive',
        title: 'Erreur de permissions',
        description: "Impossible de demander toutes les autorisations nécessaires.",
      });
    }
  };

  const handleSubmit = async () => {
    if (!intention || !currentUser) {
      toast({
        variant: 'destructive',
        title: 'Action requise',
        description: 'Veuillez sélectionner une intention avant de continuer.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // On réutilise la fonction `updateUserProfile` existante comme demandé
      const result = await updateUserProfile(currentUser.uid, {
        intention,
        profileComplete: true
      });
      
      if (!result.success) {
        throw new Error(result.error || "La mise à jour du profil a échoué.");
      }
      
      toast({
        title: 'Profil complété !',
        description: "Bienvenue sur WanderLink.",
      });
      router.push('/');
 
    } catch (error) {
      console.error('Failed to update profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la mise à jour du profil',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const intentions = ['50/50', 'Sponsor', 'Sponsorisé', 'Groupe'];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WanderlinkHeader />
      <div className="container mx-auto max-w-md flex flex-col items-center justify-center text-center pt-20">
        <h1 className="text-2xl font-bold">
          Bienvenue, {currentUser?.displayName?.split(' ')[0] || 'voyageur'} !
        </h1>
        <p className="text-muted-foreground mt-2 mb-8">
          Une dernière étape. Quelle est votre intention de voyage ?
        </p>
        
        <div className="grid grid-cols-2 gap-4 w-full">
          {intentions.map((opt) => (
            <Button
              key={opt}
              variant={intention === opt ? 'default' : 'outline'}
              className="h-20 text-lg"
              onClick={() => setIntention(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={!intention || isSubmitting}
          className="w-full mt-8"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalisation...
            </>
          ) : (
            "Terminer l'inscription"
          )}
        </Button>
      </div>
    </div>
  );
}
