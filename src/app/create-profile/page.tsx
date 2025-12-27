
"use client";

import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Step1 from '@/components/profile-creation/step1';
import Step2 from '@/components/profile-creation/step2';
import Step3 from '@/components/profile-creation/step3';
import Step4 from '@/components/profile-creation/step4';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createUserProfile } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { formSchema, type FormData } from '@/lib/schema';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

// Import for Android-specific permissions
declare var cordova: any; 

const steps = [
  { id: 1, title: 'Qui êtes-vous ?', component: Step1, fields: ['firstName', 'age', 'gender', 'profilePictures', 'bio'] },
  { id: 2, title: 'Votre profil voyageur', component: Step2, fields: ['languages', 'location', 'height', 'weight'] },
  { id: 3, title: 'Style de vie', component: Step3, fields: ['tobacco', 'alcohol', 'cannabis'] },
  { id: 4, title: 'Votre prochain voyage !', component: Step4, fields: ['destination', 'dates', 'flexibleDates', 'travelStyle', 'activities', 'intention'] },
];

export default function CreateProfilePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // --- PERMISSION REQUEST LOGIC --- //
  useEffect(() => {
    const requestAllPermissions = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        console.log("Requesting all necessary permissions on native platform.");

        // 1. Camera & Storage (Photos) - The Capacitor way
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

        // 2. Geolocation - The Capacitor way
        await Geolocation.requestPermissions();
        
        // 3. Microphone & Nearby Devices - Using the cordova plugin for specific Android permissions
        if (Capacitor.getPlatform() === 'android') {
          const androidPermissions = cordova.plugins.permissions;
          if (!androidPermissions) {
            console.warn('Android permissions plugin not found. Skipping Mic/Nearby requests.');
            return;
          }
          
          const permissionsToRequest = [
            androidPermissions.permission.RECORD_AUDIO, // Microphone
            androidPermissions.permission.BLUETOOTH_SCAN, // Nearby Devices
            androidPermissions.permission.BLUETOOTH_CONNECT // Nearby Devices
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

    // Use a small timeout to ensure plugins are ready
    const timer = setTimeout(requestAllPermissions, 500);
    return () => clearTimeout(timer);

  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push('/signup');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      age: undefined,
      gender: undefined,
      profilePictures: [],
      bio: '',
      languages: [],
      location: '',
      height: undefined,
      weight: undefined,
      tobacco: undefined,
      alcohol: undefined,
      cannabis: undefined,
      destination: 'Toutes',
      dates: { from: undefined, to: undefined },
      activities: 'Toutes',
      flexibleDates: false,
      travelStyle: 'Tous',
      intention: undefined,
    },
    mode: 'onChange'
  });

  const { trigger, handleSubmit } = methods;

  const nextStep = async () => {
    const fields = steps[currentStep].fields as (keyof FormData)[];
    const isValid = await trigger(fields);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }; 

  const handleCancel = () => {
    router.push('/');
  }

  const onSubmit = async (data: FormData) => {
    if (!currentUser) {
       toast({
        variant: 'destructive',
        title: 'Erreur d\'authentification',
        description: 'Impossible de trouver l\'utilisateur. Veuillez vous reconnecter.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createUserProfile(currentUser.uid, data);
      
      if (!result.success || !result.id) {
        throw new Error(result.error || "La création du profil a échoué.");
      }
      
      toast({
        title: 'Profil créé avec succès !',
        description: "Vous allez être redirigé vers la page d'accueil.",
      });
      router.push('/');

    } catch (error) {
      console.error('Failed to create profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la création du profil',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
       <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
       <div className="w-full max-w-2xl relative">
         <div className="flex items-center gap-2 mb-4 justify-center">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold font-logo">
                <span className="text-foreground">Wander</span><span className="text-accent">Link</span>
            </h1>
          </div>
        </div>

        <Progress value={((currentStep + 1) / steps.length) * 100} className="mb-8" />
        
        <FormProvider {...methods}>
          <form onSubmit={(e) => e.preventDefault()}>
            <CurrentStepComponent />

            <div className="mt-8 flex justify-between items-center">
              <div>
                {currentStep > 0 ? (
                  <Button type="button" variant="ghost" onClick={prevStep} disabled={isSubmitting}>
                    Précédent
                  </Button>
                ) : (
                   <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
                    Annuler
                  </Button>
                )}
              </div>
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Suivant
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Terminer l'inscription"
                  )}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
