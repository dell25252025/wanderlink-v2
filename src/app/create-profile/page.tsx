
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
  // State to show the manual retry button
  const [showPermissionRetry, setShowPermissionRetry] = useState(false);
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

  // --- PERMISSION REQUEST LOGIC (MODIFIED - Geolocation part commented out) --- //
  useEffect(() => {
    const requestAllPermissions = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      setShowPermissionRetry(false);

      /*
      // --- 1. Geolocation First & Auto-fill --- 
      try {
        const geoStatus = await Geolocation.requestPermissions();
        if (geoStatus.location === 'granted') {
          // This part is now handled in Step2 to avoid conflicts
        } else {
           toast({ variant: 'destructive', title: 'Permission de Localisation Refusée', description: "La localisation est désactivée. Vous pouvez la renseigner manuellement." });
        }
      } catch (error: any) {
         if (error.message === "Location services are not enabled") {
          toast({ variant: 'destructive', title: 'Activez la Localisation', description: "Veuillez activer le GPS, puis appuyez sur Réessayer." });
          setShowPermissionRetry(true);
        } else {
          toast({ variant: 'destructive', title: 'Erreur de Géolocalisation', description: "Impossible de demander la permission de localisation." });
        }
        return; // Stop the flow if geolocation fails
      }
      */

      // --- 2. Camera & Photos ---
      try { await Camera.requestPermissions({ permissions: ['camera', 'photos'] }); } catch (e) { console.error(e) }

      // --- 3. Android Specific (Mic, Bluetooth) ---
      if (Capacitor.getPlatform() === 'android') {
        try {
          await new Promise<void>((resolve, reject) => {
            const req = () => {
              if (window.cordova?.plugins?.permissions) {
                const p = window.cordova.plugins.permissions;
                p.requestPermissions(['android.permission.RECORD_AUDIO', 'android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT'], (st: any) => { if (!st.hasPermission) console.warn("Mic/BT permissions not granted."); resolve(); }, reject);
              } else { reject(new Error("Cordova permissions plugin not available.")); }
            };
            if (window.cordova) req(); else document.addEventListener('deviceready', req, { once: true });
          });
        } catch(e) { console.error(e); }
      }
    };

    requestAllPermissions();

  }, [toast, setValue]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUser(user); } else { router.push('/signup'); }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  const handlePermissionRetry = () => {
    const reRequestPermissions = async () => {
        if (!Capacitor.isNativePlatform()) return;
        setShowPermissionRetry(false);
        try {
            const geoStatus = await Geolocation.requestPermissions();
            if (geoStatus.location !== 'granted') {
                toast({ variant: 'destructive', title: 'Activez la Localisation', description: "Le GPS doit être activé. Veuillez l\'activer et réessayer." });
                setShowPermissionRetry(true);
                return;
            }
            // Logic to set value is removed from here to avoid conflict

            try { await Camera.requestPermissions({ permissions: ['camera', 'photos'] }); } catch (e) { console.error(e) }
            if (Capacitor.getPlatform() === 'android') {
                try {
                    await new Promise<void>((resolve, reject) => {
                        const req = () => {
                            if (window.cordova?.plugins?.permissions) {
                                const p = window.cordova.plugins.permissions;
                                p.requestPermissions(['android.permission.RECORD_AUDIO', 'android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT'], (st: any) => { if (!st.hasPermission) console.warn("Mic/BT permissions not granted."); resolve(); }, reject);
                            } else { reject(new Error("Cordova permissions plugin not available.")); }
                        };
                        if (window.cordova) req(); else document.addEventListener('deviceready', req, { once: true });
                    });
                } catch(e) { console.error(e); }
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Activez la Localisation', description: "Le GPS semble toujours désactivé. Veuillez l\'activer et réessayer." });
            setShowPermissionRetry(true);
        }
    };
    reRequestPermissions();
  }

  const nextStep = async () => {
    const fields = steps[currentStep].fields as (keyof FormData)[];
    const isValid = await trigger(fields);
    if (isValid && currentStep < steps.length - 1) { setCurrentStep(currentStep + 1); }
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold font-logo"><span className="text-foreground">Wander</span><span className="text-accent">Link</span></h1>
          </div>
        </div>
        <Progress value={((currentStep + 1) / steps.length) * 100} className="mb-8" />
        <FormProvider {...methods}>
          <form onSubmit={(e) => e.preventDefault()}>
            <CurrentStepComponent />
            <div className="mt-8 flex justify-between items-center">
              <div>
                {currentStep > 0 ? (<Button type="button" variant="ghost" onClick={prevStep} disabled={isSubmitting}>Précédent</Button>) : (<Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>Annuler</Button>)}
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
