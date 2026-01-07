
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

// Declare cordova for the permissions plugin
declare var cordova: any;

const steps = [
  { id: 1, title: 'Qui êtes-vous ?', component: Step1, fields: ['firstName', 'age', 'gender', 'profilePictures', 'bio'] },
  { id: 2, title: 'Votre profil voyageur', component: Step2, fields: ['languages', 'location', 'height', 'weight'] },
  { id: 3, title: 'Style de vie', component: Step3, fields: ['tobacco', 'alcohol', 'cannabis'] },
  { id: 4, 'title': 'Votre prochain voyage !', component: Step4, fields: ['destination', 'dates', 'flexibleDates', 'travelStyle', 'activities', 'intention'] },
];

export default function CreateProfilePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

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

  const { trigger, handleSubmit, setValue } = methods;

  // --- PERMISSION REQUEST LOGIC (USER-CENTRIC & ROBUST) --- //
  useEffect(() => {
    const requestAllPermissions = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log("Not a native platform. Skipping permission requests.");
        return;
      }

      // --- 1. Geolocation First & Auto-fill --- 
      try {
        console.log("Requesting Geolocation permission...");
        const geoStatus = await Geolocation.requestPermissions();
        
        if (geoStatus.location === 'granted') {
          console.log("Geolocation permission granted. Fetching position...");
          const position = await Geolocation.getCurrentPosition();
          const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
          setValue('location', coords, { shouldValidate: true });
          console.log("Location field set to:", coords);
        } else {
          console.warn("Geolocation permission was not granted.");
           toast({
            variant: 'destructive',
            title: 'Permission de Localisation Refusée',
            description: "La localisation automatique est désactivée. Vous pouvez la renseigner manuellement.",
          });
          // Do not stop the flow, user can input manually
        }

      } catch (error: any) {
         if (error.message === "Location services are not enabled") {
          console.error("Specific Error: Location services are disabled on the device.");
          toast({
            variant: 'destructive',
            title: 'Activez la Localisation',
            description: "Pour continuer, veuillez activer les services de localisation de votre téléphone dans les paramètres.",
          });
        } else {
          console.error("An error occurred during Geolocation permission request:", error);
          toast({
            variant: 'destructive',
            title: 'Erreur de Géolocalisation',
            description: "Impossible de demander la permission de localisation.",
          });
        }
        return; // Stop the flow if geolocation fails for any reason
      }

      // --- 2. Camera & Photos ---
      try {
        console.log("Requesting Camera/Photos permission...");
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
        console.log("Camera/Photos permission request finished.");
      } catch (error) {
        console.error("Error requesting camera permissions:", error);
        // Non-fatal, just inform the user
        toast({ title: 'Erreur de Caméra', description: "Impossible d'obtenir la permission pour la caméra." });
      }

      // --- 3. Android Specific (Mic, Bluetooth) ---
      if (Capacitor.getPlatform() === 'android') {
        try {
          console.log("Requesting Android-specific permissions (Mic, Bluetooth)...");
          await new Promise<void>((resolve, reject) => {
            const executeRequest = () => {
              if (window.cordova?.plugins?.permissions) {
                const androidPermissions = window.cordova.plugins.permissions;
                const permissionsToRequest = [
                  'android.permission.RECORD_AUDIO',
                  'android.permission.BLUETOOTH_SCAN',
                  'android.permission.BLUETOOTH_CONNECT'
                ];

                androidPermissions.requestPermissions(
                  permissionsToRequest,
                  (status: any) => {
                    if (!status.hasPermission) console.warn("Some Android-specific permissions were NOT granted.");
                    resolve();
                  },
                  (err: any) => reject(err)
                );
              } else {
                reject(new Error("Cordova permissions plugin not available."));
              }
            };
            
            if (window.cordova) executeRequest();
            else document.addEventListener('deviceready', executeRequest, { once: true });
          });
          console.log("Android-specific permission request finished.");
        } catch(error) {
          console.error("Error requesting Android specific permissions:", error);
          toast({ title: 'Erreur de Permissions Android', description: "Impossible d'obtenir les permissions pour le micro/bluetooth." });
        }
      }

      console.log("All permission requests are completed.");
    };

    requestAllPermissions();

  }, [toast, setValue]);

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
