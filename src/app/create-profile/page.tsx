
"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { countries } from '@/lib/countries';

declare var cordova: any;

const steps = [
  { id: 1, title: 'Qui êtes-vous ?', component: Step1, fields: ['firstName', 'age', 'gender', 'profilePictures', 'bio'] },
  { id: 2, title: 'Votre profil voyageur', component: Step2, fields: ['languages', 'location', 'height', 'weight'] },
  { id: 3, title: 'Style de vie', component: Step3, fields: ['tobacco', 'alcohol', 'cannabis'] },
  { id: 4, 'title': 'Votre prochain voyage !', component: Step4, fields: ['destination', 'dates', 'flexibleDates', 'travelStyle', 'activities', 'intention'] },
];

function ProfileCreationForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPermissionRetry, setShowPermissionRetry] = useState(false);
  const [isGoogleOnboarding, setIsGoogleOnboarding] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      profilePictures: [],
      languages: [],
      destination: 'Toutes',
      activities: 'Toutes',
      travelStyle: 'Tous',
      flexibleDates: false,
    },
    mode: 'onChange'
  });

  const { trigger, handleSubmit, setValue, getValues, reset } = methods;

  useEffect(() => {
    const firstName = searchParams.get('firstName');
    const photoURL = searchParams.get('photoURL');
    if (firstName && photoURL) {
      setIsGoogleOnboarding(true);
      // Use reset to initialize the form with Google data
      reset({ 
        ...getValues(), // preserve any existing default values
        firstName: firstName, 
        profilePictures: [photoURL] 
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, reset]);

  useEffect(() => {
    const requestAllPermissions = async () => {
      // Permission logic remains unchanged
       if (!Capacitor.isNativePlatform()) return;
      
      setShowPermissionRetry(false);
      try {
        const geoStatus = await Geolocation.requestPermissions();
        if (geoStatus.location === 'granted') {
          const position = await Geolocation.getCurrentPosition();
          const { latitude, longitude } = position.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr&zoom=3`;
          const response = await fetch(url, { headers: { 'User-Agent': 'WanderLink/1.0 (tech.wanderlink.app)' } });
          if (!response.ok) throw new Error('Reverse geocoding failed');
          const data = await response.json();
          const countryCode = data?.address?.country_code;
          if (countryCode) {
            const foundCountry = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());
            if (foundCountry) {
              setValue('location', foundCountry.name, { shouldValidate: true });
            }
          }
        } else {
           toast({ variant: 'destructive', title: 'Permission de Localisation Refusée', description: "La localisation est désactivée. Vous pouvez la renseigner manuellement." });
        }
      } catch (error: any) {
         if (error.message === "Location services are not enabled") {
          toast({ variant: 'destructive', title: 'Activez la Localisation', description: "Veuillez activer le GPS, puis appuyez sur Réessayer." });
          setShowPermissionRetry(true);
          return;
        } else {
          console.error("Initial geolocation error:", error);
          toast({ variant: 'destructive', title: 'Erreur de Géolocalisation', description: "Impossible de déterminer la position." });
        }
      }
      try { await Camera.requestPermissions({ permissions: ['camera', 'photos'] }); } catch (e) { console.error("Camera permission error:", e) }
      if (Capacitor.getPlatform() === 'android') {
        try {
          await new Promise<void>((resolve, reject) => {
            const req = () => {
              if (window.cordova?.plugins?.permissions) {
                const p = window.cordova.plugins.permissions;
                p.requestPermissions(['android.permission.RECORD_AUDIO', 'android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT'], (st: any) => { if (!st.hasPermission) console.warn("Mic/BT permissions not granted."); resolve(); }, reject);
              } else { console.warn("Cordova permissions plugin not available at this time."); resolve(); }
            };
            if (window.cordova) req(); else document.addEventListener('deviceready', req, { once: true });
          });
        } catch(e) { console.error("Android specific permissions error:", e); }
      }
    };
    requestAllPermissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextStep = useCallback(async () => {
    const fieldsToValidate = steps[currentStep].fields as (keyof FormData)[];
    const isValid = await trigger(fieldsToValidate);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, trigger]);

  // --- GOOGLE ONBOARDING AUTO-NAVIGATION --- //
  useEffect(() => {
    if (isGoogleOnboarding && currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        nextStep();
      }, 500); // 500ms delay for a smoother feel
      return () => clearTimeout(timer); // Cleanup
    }
  }, [currentStep, isGoogleOnboarding, nextStep]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUser(user); } else { router.push('/signup'); }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  const handlePermissionRetry = async () => {
      // This function logic remains unchanged
       if (!Capacitor.isNativePlatform()) return;
      setShowPermissionRetry(false);
      try {
          const geoStatus = await Geolocation.requestPermissions();
          if (geoStatus.location !== 'granted') {
              toast({ variant: 'destructive', title: 'Activez la Localisation', description: "Le GPS doit être activé. Veuillez l\'activer et réessayer." });
              setShowPermissionRetry(true);
              return;
          }
          const position = await Geolocation.getCurrentPosition();
          const { latitude, longitude } = position.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr&zoom=3`;
          const response = await fetch(url, { headers: { 'User-Agent': 'WanderLink/1.0 (tech.wanderlink.app)' } });
          if (!response.ok) throw new Error('Reverse geocoding failed');
          const data = await response.json();
          const countryCode = data?.address?.country_code;
          if (countryCode) {
              const foundCountry = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());
              if (foundCountry) {
                  setValue('location', foundCountry.name, { shouldValidate: true });
                  toast({ title: "Position trouvée !", description: `Pays défini sur : ${foundCountry.name}` });
              } else { throw new Error('Country code not found'); }
          } else { throw new Error('Country code not in response'); }
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Activez la Localisation', description: "Le GPS semble toujours désactivé. Veuillez l\'activer et réessayer." });
          setShowPermissionRetry(true);
      }
  };

  const prevStep = () => { if (currentStep > 0) { setCurrentStep(currentStep - 1); } }; 
  const handleCancel = () => { router.push('/'); }

  const onSubmit = async (data: FormData) => {
    if (!currentUser) { toast({ variant: 'destructive', title: 'Erreur d\'authentification', description: 'Veuillez vous reconnecter.' }); return; }
    setIsSubmitting(true);
    try {
      const result = await createUserProfile(currentUser.uid, data);
      if (!result.success || !result.id) { throw new Error(result.error || "La création du profil a échoué."); }
      toast({ title: 'Profil créé avec succès !', description: "Redirection vers la page d\'accueil." });
      router.push('/');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      toast({ variant: 'destructive', title: 'Erreur lors de la création du profil', description: msg });
    } finally { setIsSubmitting(false); }
  };

  if (authLoading) { return ( <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div> ) }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
       <div className="w-full max-w-2xl relative">
         <div className="flex items-center gap-2 mb-4 justify-center">
            <h1 className="text-3xl font-bold font-logo"><span className="text-foreground">Wander</span><span className="text-accent">Link</span></h1>
        </div>
        <Progress value={((currentStep + 1) / steps.length) * 100} className="mb-8" />
        <FormProvider {...methods}>
          <form onSubmit={(e) => e.preventDefault()}>
            <CurrentStepComponent />
            <div className="mt-8 flex justify-between items-center">
              <div>
                {currentStep > 0 && !isGoogleOnboarding ? (
                  <Button type="button" variant="ghost" onClick={prevStep} disabled={isSubmitting}>Précédent</Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>Annuler</Button>
                )}
              </div>

              <div className="flex items-center gap-x-2">
                {showPermissionRetry && (
                    <Button type="button" variant="secondary" onClick={handlePermissionRetry}>
                        Réessayer
                    </Button>
                )}
                {currentStep < steps.length - 1 ? (
                  <Button type="button" onClick={nextStep}>
                    Suivant
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting || showPermissionRetry}>
                    {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>) : ("Terminer l'inscription")}
                  </Button>
                )}
              </div>

            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

export default function CreateProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileCreationForm />
    </Suspense>
  );
}
