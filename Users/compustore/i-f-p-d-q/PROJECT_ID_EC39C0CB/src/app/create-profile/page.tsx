
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
import { useOnboarding } from '@/context/OnboardingContext';
import { PushNotifications } from '@capacitor/push-notifications';

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
  const [permissionsReady, setPermissionsReady] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { mode, setMode, setOverlayActive } = useOnboarding(); // Use the context

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

  const { trigger, handleSubmit, setValue, getValues, reset, watch } = methods;
  const watchedIntention = watch('intention');
  
    // --- POINT DE SORTIE --- //
  useEffect(() => {
    if (currentStep === steps.length - 1 && mode === 'google') {
      setOverlayActive(false);
      setMode(null);
    }
  }, [currentStep, mode, setOverlayActive, setMode]);


  useEffect(() => {
    const firstName = searchParams.get('firstName');
    const photoURL = searchParams.get('photoURL');
    if (firstName && photoURL) {
      setIsGoogleOnboarding(true);
      reset({ ...getValues(), firstName: firstName, profilePictures: [photoURL] });
    }

    const requestAllPermissions = async () => {
      if (!Capacitor.isNativePlatform()) {
        setPermissionsReady(true);
        return;
      }
      
      try {
        await PushNotifications.requestPermissions();
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
            if (foundCountry) setValue('location', foundCountry.name, { shouldValidate: true });
          }
        }
      } catch (e) { 
        console.warn("Geolocation or Notification permission/request failed", e); 
        toast({ variant: 'default', title: 'Permissions Optionnelles', description: "Certaines permissions peuvent être accordées manuellement plus tard." });
      }

      try {
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      } catch (e) { 
        console.warn("Camera/Photos permission failed", e);
      }

      setPermissionsReady(true);
    };

    requestAllPermissions();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, reset]);


  const nextStep = useCallback(async () => {
    const fieldsToValidate = steps[currentStep].fields as (keyof FormData)[];
    const isValid = await trigger(fieldsToValidate);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, trigger]);

  useEffect(() => {
    if (isGoogleOnboarding && permissionsReady && currentStep < steps.length - 1) {
      const timer = setTimeout(() => { nextStep(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isGoogleOnboarding, permissionsReady, nextStep]);

 const onSubmit = useCallback(async (data: FormData) => {
    if (isSubmitting) return;
    if (!currentUser) { toast({ variant: 'destructive', title: 'Erreur d\'authentification' }); return; }
    setIsSubmitting(true);
    try {
      const result = await createUserProfile(currentUser.uid, data);
      if (!result.success || !result.id) { throw new Error(result.error || "La création du profil a échoué."); }
      toast({ title: 'Profil créé avec succès !', description: "Bienvenue sur WanderLink !" });
      router.push('/');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      toast({ variant: 'destructive', title: 'Erreur lors de la création du profil', description: msg });
      setIsSubmitting(false);
    }
  }, [currentUser, router, toast, isSubmitting]);

  useEffect(() => {
    if ( isGoogleOnboarding && currentStep === steps.length - 1 && watchedIntention && !isSubmitting ) {
      handleSubmit(onSubmit)();
    }
  }, [watchedIntention, isGoogleOnboarding, currentStep, isSubmitting, handleSubmit, onSubmit]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUser(user); } else { router.push('/signup'); }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  const prevStep = () => { if (currentStep > 0) { setCurrentStep(currentStep - 1); } }; 
  const handleCancel = () => { router.push('/'); }

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
                {!(isGoogleOnboarding && watchedIntention) && (
                   currentStep < steps.length - 1 ? (
                    <Button type="button" onClick={nextStep}>
                      Suivant
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting || showPermissionRetry}>
                      {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>) : ("Terminer l'inscription")}
                    </Button>
                  )
                )}

                {isGoogleOnboarding && isSubmitting && currentStep === steps.length - 1 && (
                   <Button type="button" disabled={true}>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalisation...
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
