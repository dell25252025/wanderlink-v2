
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plane, Trash2, UploadCloud, X, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getUserProfile, updateUserProfile, addProfilePicture, removeProfilePicture } from '@/lib/firebase-actions';
import { formSchema, type FormData } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import Image from 'next/image';
import { CountrySelect } from '@/components/country-select';
import { GenericSelect } from '@/components/generic-select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { travelIntentions, travelStyles, travelActivities } from '@/lib/options';
import { Separator } from '@/components/ui/separator';

const MAX_PHOTOS = 6;

export default function EditProfileClientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const profileId = searchParams.get('id');
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const methods = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { profilePictures: [] },
    });

    const { control, handleSubmit, setValue, getValues, watch } = methods;
    const profilePictures = watch('profilePictures') || [];
    const areDatesFlexible = watch('flexibleDates');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.uid === profileId) {
                setCurrentUser(user);
                const fetchProfile = async () => {
                    try {
                        const profileData = await getUserProfile(user.uid);
                        if (profileData) {
                            Object.entries(profileData).forEach(([key, value]) => {
                                if (key === 'dates' && value) {
                                    setValue('dates', {
                                        from: value.from ? new Date(value.from) : undefined,
                                        to: value.to ? new Date(value.to) : undefined,
                                    });
                                } else {
                                    setValue(key as keyof FormData, value);
                                }
                            });
                        }
                    } catch (error) {
                       console.error("Failed to fetch profile:", error);
                    }
                };
                fetchProfile();
            } else {
                router.push('/signup');
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, [router, profileId, setValue]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !currentUser) return;
        setIsUploading(true);

        const uploadPromises = Array.from(files).slice(0, MAX_PHOTOS - profilePictures.length).map(file => {
             return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const result = await addProfilePicture(currentUser.uid, e.target?.result as string);
                        if (result.success && result.url) {
                            resolve(result.url);
                        } else {
                            reject(new Error(result.error || 'Upload failed'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        try {
            const uploadedUrls = await Promise.all(uploadPromises);
            setValue('profilePictures', [...profilePictures, ...uploadedUrls], { shouldValidate: true });
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur d'upload", description: "Une photo n'a pas pu être ajoutée." });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removePicture = async (urlToRemove: string) => {
        if (!currentUser) return;
        try {
            await removeProfilePicture(currentUser.uid, urlToRemove);
            setValue('profilePictures', profilePictures.filter(url => url !== urlToRemove), { shouldValidate: true });
            toast({ title: "Photo supprimée" });
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la photo." });
        }
    };

    const onSubmit = async (data: FormData) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            const result = await updateUserProfile(currentUser.uid, data);
            if (!result.success) throw new Error(result.error);
            toast({ title: 'Profil mis à jour avec succès !' });
            router.push(`/profile?id=${currentUser.uid}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
            toast({ variant: 'destructive', title: 'Erreur de mise à jour', description: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <FormProvider {...methods}>
             <header className="fixed top-0 z-20 w-full h-12 flex items-center justify-between border-b bg-background/95 px-2 py-1 backdrop-blur-sm md:px-4">
                <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Retour</span>
                </Button>
                <h1 className="text-sm font-semibold">Modifier le profil</h1>
                <div className="w-8"></div>
            </header>
            <main className="pt-12">
                <Form {...methods}>
                    <form onSubmit={handleSubmit(onSubmit)} className="min-h-screen bg-background text-foreground">
                        <div className="max-w-4xl mx-auto p-4">

                            <div className="space-y-6">
                                {/* Section Informations Personnelles */}
                                <div className="p-4 md:p-6 border rounded-lg space-y-4">
                                    <h2 className="text-xl font-semibold">Informations Personnelles</h2>
                                    <FormField control={control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="age" render={({ field }) => (<FormItem><FormLabel>Âge</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="gender" render={({ field }) => (<FormItem><FormLabel>Genre</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Homme" /></FormControl><FormLabel>Homme</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Femme" /></FormControl><FormLabel>Femme</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Autre" /></FormControl><FormLabel>Autre</FormLabel></FormItem></RadioGroup><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="height" render={({ field }) => (<FormItem><FormLabel>Taille (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="Ex: 175" onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="weight" render={({ field }) => (<FormItem><FormLabel>Poids (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="Ex: 70" onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="bio" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                
                                {/* Section Photos */}
                                <div className="p-4 md:p-6 border rounded-lg space-y-4">
                                    <h2 className="text-xl font-semibold">Mes Photos</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {profilePictures.map((src, index) => (
                                            <div key={index} className="relative aspect-square">
                                                <Image src={src} alt={`Photo ${index + 1}`} fill className="object-cover rounded-md" />
                                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removePicture(src)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                        {profilePictures.length < MAX_PHOTOS && (
                                            <div className="aspect-square flex items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
                                                <div className="text-center text-muted-foreground">{isUploading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : <><UploadCloud className="h-8 w-8 mx-auto" /><span className="text-sm mt-2">Ajouter</span></>}</div>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} disabled={isUploading} />
                                </div>
                                
                                {/* Section Style de Vie */}
                                <div className="p-4 md:p-6 border rounded-lg space-y-4">
                                    <h2 className="text-xl font-semibold">Style de Vie</h2>
                                    <FormField control={control} name="tobacco" render={({ field }) => (<FormItem><FormLabel>Tabac</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une option" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Non-fumeur">Non-fumeur</SelectItem><SelectItem value="Occasionnellement">Occasionnellement</SelectItem><SelectItem value="Régulièrement">Régulièrement</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="alcohol" render={({ field }) => (<FormItem><FormLabel>Alcool</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une option" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Jamais">Jamais</SelectItem><SelectItem value="Occasionnellement">Occasionnellement</SelectItem><SelectItem value="Souvent">Souvent</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="cannabis" render={({ field }) => (<FormItem><FormLabel>Cannabis</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une option" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Non-fumeur">Non-fumeur</SelectItem><SelectItem value="Occasionnellement">Occasionnellement</SelectItem><SelectItem value="Régulièrement">Régulièrement</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                </div>

                                {/* Section Voyage */}
                                <div className="p-4 md:p-6 border rounded-lg space-y-4">
                                    <h2 className="text-xl font-semibold">Mon Prochain Voyage</h2>
                                    
                                    <div className="rounded-lg border bg-card p-4">
                                        <FormField
                                            control={control}
                                            name="destination"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between">
                                                    <FormLabel className="text-muted-foreground">Je veux aller à</FormLabel>
                                                    <FormControl>
                                                        <CountrySelect 
                                                            className="w-auto md:w-[250px]"
                                                            value={field.value} 
                                                            onValueChange={field.onChange} 
                                                            placeholder="Toutes"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="rounded-lg border bg-card p-4 space-y-4">
                                        <FormField
                                            control={control}
                                            name="dates"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <DateRangePicker 
                                                            date={field.value?.from ? field.value : undefined} 
                                                            onDateChange={field.onChange} 
                                                            disabled={areDatesFlexible} 
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name="flexibleDates"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 pt-2">
                                                    <FormControl>
                                                        <Checkbox
                                                            id="flexible-dates"
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormLabel htmlFor="flexible-dates">Mes dates sont flexibles</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    
                                    <div className="rounded-lg border bg-card p-4 space-y-2">
                                        <FormField
                                            control={control}
                                            name="intention"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between text-sm">
                                                    <FormLabel className="text-muted-foreground">Intention</FormLabel>
                                                    <FormControl>
                                                        <GenericSelect 
                                                            className="w-auto md:w-[250px]"
                                                            value={field.value} 
                                                            onValueChange={field.onChange} 
                                                            options={travelIntentions} 
                                                            placeholder="Toutes"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Separator />
                                        <FormField
                                            control={control}
                                            name="travelStyle"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between text-sm">
                                                    <FormLabel className="text-muted-foreground">Style de voyage</FormLabel>
                                                    <FormControl>
                                                        <GenericSelect 
                                                            className="w-auto md:w-[250px]"
                                                            value={field.value} 
                                                            onValueChange={field.onChange} 
                                                            options={travelStyles} 
                                                            placeholder="Tous"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Separator />
                                        <FormField
                                            control={control}
                                            name="activities"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between text-sm">
                                                    <FormLabel className="text-muted-foreground">Activités</FormLabel>
                                                    <FormControl>
                                                        <GenericSelect 
                                                            className="w-auto md:w-[250px]"
                                                            value={field.value} 
                                                            onValueChange={field.onChange} 
                                                            options={travelActivities} 
                                                            placeholder="Toutes"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 pb-16">
                                    <Button type="submit" size="lg" disabled={isSubmitting}>
                                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</> : <><Save className="mr-2 h-4 w-4" />Sauvegarder</>}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </Form>
            </main>
        </FormProvider>
    );
}
