
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/firebase-actions'; // Mise à jour de l'import

const loginSchema = z.object({
  email: z.string().email({ message: 'Adresse e-mail invalide.' }),
  password: z.string().min(1, { message: 'Le mot de passe est obligatoire.' }),
});

const signupSchema = z.object({
  email: z.string().email({ message: 'Adresse e-mail invalide.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});

type AuthFormProps = {
  isLogin: boolean;
  setIsLogin: (isLogin: boolean) => void;
  isEmailFormVisible: boolean;
  setIsEmailFormVisible: (isVisible: boolean) => void;
  onSuccess?: () => void; 
};

export default function AuthForm({ isLogin, setIsLogin, isEmailFormVisible, setIsEmailFormVisible, onSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: z.infer<typeof loginSchema | typeof signupSchema>) {
    setIsLoading(true);
    try {
      if (isLogin) {
        const loginValues = values as z.infer<typeof loginSchema>;
        await signInWithEmailAndPassword(auth, loginValues.email, loginValues.password);
        toast({ title: 'Connexion réussie !', description: 'Heureux de vous revoir.' });
        if (onSuccess) onSuccess(); else router.push('/');
      } else {
        const signupValues = values as z.infer<typeof signupSchema>;
        await createUserWithEmailAndPassword(auth, signupValues.email, signupValues.password);
        toast({ title: 'Compte créé !', description: "Vous pouvez maintenant vous connecter." });
        router.push('/create-profile');
      }
    } catch (error) {
      let description = "Une erreur inattendue s'est produite.";
      if (error instanceof FirebaseError) {
        if (isLogin) {
          description = "Email ou mot de passe incorrect.";
        } else if (error.code === 'auth/email-already-in-use') {
          description = "Un compte existe déjà avec cette adresse e-mail.";
        }
      }
      toast({ variant: 'destructive', title: isLogin ? 'Erreur de connexion' : 'Erreur de création de compte', description });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      
      // La logique pour mobile (redirection) ne renverra rien ici.
      // La gestion se fera via AuthHandler au retour dans l'app.
      if (result) {
        if (result.success) {
            toast({ title: 'Connexion réussie !', description: 'Bienvenue sur WanderLink.' });
            if (result.isNewUser) {
                router.push('/create-profile');
            } else {
                router.push('/');
            }
        } else {
            throw new Error(result.error || "Une erreur inattendue lors de la connexion Google.");
        }
      }
      // Si result est null, c'est que la redirection est en cours sur mobile. Ne rien faire.

    } catch (error) {
      console.error("Erreur de connexion Google:", error);
      const errorMessage = error instanceof Error ? error.message : "Une erreur inattendue s'est produite.";
      toast({ variant: 'destructive', title: 'Erreur de connexion Google', description: errorMessage });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  const toggleForm = () => {
    setIsLogin(!isLogin);
    form.reset();
  };

  return (
    <div className="w-full pb-8">
      <div className="hidden md:block text-center mb-4">
        <h2 className="text-xl font-semibold text-white">{isLogin ? 'Connectez-vous' : 'Créez votre compte'}</h2>
        <p className="text-sm text-white/90">
          {isLogin ? 'Heureux de vous revoir !' : 'Rejoignez la communauté de voyageurs.'}
        </p>
      </div>

      <div className={`flex flex-col gap-4 ${isEmailFormVisible ? 'hidden' : 'block'} mb-4 md:mt-0 mt-8`}>
        <div className="text-center">
          <Button variant="outline" className="w-full bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
            {isGoogleLoading ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mr-2 h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
            Continuer avec Google
          </Button>
          <p className="mt-0.5 text-[9px] text-white md:hidden">
            Nous ne publions jamais rien sur vos comptes de réseaux sociaux
          </p>
        </div>

        <div className="relative hidden md:flex items-center"><div className="w-full border-t border-white/30" /><div className="px-2 text-xs uppercase text-white/70">Ou</div><div className="w-full border-t border-white/30" /></div>

        <div className="flex flex-col items-center">
          <Button variant="outline" size="icon" aria-label="S'inscrire avec un e-mail" onClick={() => { setIsEmailFormVisible(true); setIsLogin(false); form.reset(); }} className="bg-white border-white text-black hover:bg-slate-100">
            <Mail className="h-5 w-5" />
          </Button>
          <Button variant="link" className="text-white h-auto p-0 text-sm mt-8 mb-2" onClick={() => { setIsEmailFormVisible(true); setIsLogin(true); form.reset(); }}>
            Connexion
          </Button>
        </div>
      </div>

      <div className={`w-full ${isEmailFormVisible ? 'block' : 'hidden'}`}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="nom@exemple.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!isLogin && (
               <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="********"
                            {...field}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </Button>
                       </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full !mt-10" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Se connecter' : "Créer un compte"}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center">
          <Button variant="link" className="text-foreground/80 hover:text-foreground" onClick={toggleForm}>
            {isLogin ? "Créer un compte" : "Connectez-vous"}
          </Button>
        </div>
      </div>
    </div>
  );
}
