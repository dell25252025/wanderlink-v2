
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { updateUserProfile } from '@/lib/firebase-actions';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

declare var cordova: any;

const intentions = [
  { id: '50-50', label: '50/50' },
  { id: 'sponsor', label: 'Sponsor' },
  { id: 'sponsored', label: 'Sponsorisé' },
  { id: 'group', label: 'Groupe' },
];

export default function GoogleOnboardingPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        requestAllPermissions();
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const requestAllPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      await Geolocation.requestPermissions();
      
      if (Capacitor.getPlatform() === 'android') {
        document.addEventListener('deviceready', () => {
          const androidPermissions = cordova.plugins.permissions;
          if (!androidPermissions) return;
          
          const permissionsToRequest = [
            'android.permission.RECORD_AUDIO',
            'android.permission.BLUETOETOOTH_SCAN',
            'android.permission.BLUETOOTH_CONNECT'
          ];

          androidPermissions.requestPermissions(permissionsToRequest, 
            (status: any) => {
              if (!status.hasPermission) {
                console.warn('Some Android-specific permissions were not granted.');
              }
            },
            (error: any) => {
              console.error('Error requesting Android-specific permissions:', error);
            }
          );
        }, false);
      }
    } catch (error) {
      console.error("Error while requesting permissions:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur de permissions',
        description: "Impossible de demander toutes les autorisations nécessaires."
      });
    }
  };

  const handleSelectIntention = async (intention: string) => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const result = await updateUserProfile(currentUser.uid, { intention });
      
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">Presque fini !</h1>
        <p className="text-muted-foreground mb-8">Choisissez votre intention de voyage principale.</p>

        <div className="grid grid-cols-2 gap-4">
          {intentions.map((intention) => (
            <Button 
              key={intention.id} 
              variant="outline" 
              className="h-24 text-lg"
              onClick={() => handleSelectIntention(intention.id)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : intention.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
