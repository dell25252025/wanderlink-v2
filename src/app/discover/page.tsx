
"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type algoliasearch from 'algoliasearch/lite';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import WanderlinkHeader from '@/components/wanderlink-header';
import { CountrySelect } from '@/components/country-select';
import { GenericSelect } from '@/components/generic-select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AgeRangeSlider } from '@/components/ui/age-range-slider';
import type { DateRange } from 'react-day-picker';
import { travelIntentions, travelStyles, travelActivities } from '@/lib/options';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, updateUserDiscoverFilters } from '@/lib/firebase-actions';
import type { DocumentData } from 'firebase/firestore';
import { Loader2, Search } from 'lucide-react';
import { useAd } from '@/context/ad-context';
import { useToast } from '@/hooks/use-toast';

declare global {
    interface Window { 
        algoliasearch: typeof algoliasearch;
        __ALGOLIA_APP_ID__: string;
        __ALGOLIA_SEARCH_KEY__: string;
    }
}

let usersIndexSingleton: ReturnType<ReturnType<typeof algoliasearch>['initIndex']> | null = null;

async function getUsersIndex(): Promise<ReturnType<ReturnType<typeof algoliasearch>['initIndex']> | null> {
  if (usersIndexSingleton) return usersIndexSingleton;
  if (typeof window !== 'undefined' && !window.algoliasearch) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (window.algoliasearch) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
  if (typeof window === 'undefined' || !window.algoliasearch) {
      console.error("Algolia script could not be loaded or not in a browser environment.");
      return null;
  }
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || window.__ALGOLIA_APP_ID__;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || window.__ALGOLIA_SEARCH_KEY__;
  if (!appId || !searchKey) {
    console.error("Algolia keys are missing.");
    return null;
  }
  const client = window.algoliasearch(appId, searchKey);
  usersIndexSingleton = client.initIndex("users");
  return usersIndexSingleton;
}

const FILTERS_STORAGE_KEY = 'discoverFilters';
export const SEARCH_RESULTS_STORAGE_KEY = 'searchResults';

function DiscoverClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { searchCount, incrementSearchCount, triggerAdShowOnSearch } = useAd();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [userProfile, setUserProfile] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [filtersLoaded, setFiltersLoaded] = useState(false); // Nouvel état pour le contrôle du chargement

    // States for filters
    const [showMe, setShowMe] = useState('Tous');
    const [ageRange, setAgeRange] = useState<[number, number]>([18, 45]);
    const [date, setDate] = useState<DateRange | undefined>();
    const [flexibleDates, setFlexibleDates] = useState(true);
    const [nearby, setNearby] = useState(true);
    const [country, setCountry] = useState('');
    const [destination, setDestination] = useState('Toutes');
    const [intention, setIntention] = useState('');
    const [travelStyle, setTravelStyle] = useState('Tous');
    const [activities, setActivities] = useState('Toutes');

    const hasAutoSearched = useRef(false);
    const operationUidRef = useRef<string | null>(null);

    // La fonction `saveFilters` n'est plus utilisée directement, mais sa logique est déplacée dans `handleSearch`.
    // Nous la gardons vide pour ne pas casser d'éventuelles futures dépendances, mais elle n'est plus active.
    const saveFilters = useCallback(() => {}, []);

    useEffect(() => {
        // Effet pour l'authentification et le chargement du profil
        const authUnsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthReady(true);
            setCurrentUser(user);
            operationUidRef.current = user ? user.uid : null;

            if (user) {
                getUserProfile(user.uid).then(profile => {
                    if (operationUidRef.current === user.uid) {
                        setUserProfile(profile);
                        setLoading(false); // Le chargement principal est terminé
                    }
                });
            } else {
                setUserProfile(null);
                setLoading(false);
                setFiltersLoaded(true); // Pas d'utilisateur, les filtres sont considérés "chargés" (par défaut)
                router.push('/login');
            }
        });

        if (!document.querySelector('script[src="https://cdn.jsdelivr.net/npm/algoliasearch@4/dist/algoliasearch-lite.umd.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/algoliasearch@4/dist/algoliasearch-lite.umd.js';
            script.async = true;
            document.body.appendChild(script);
        }

        return () => authUnsubscribe();
    }, [router]);

    useEffect(() => {
        // Effet pour la restauration des filtres une fois le profil chargé
        if (userProfile && currentUser && !filtersLoaded) {
            let filtersToApply = null;

            if (userProfile.discoverFilters) {
                console.log("Restoring filters from Firestore.");
                filtersToApply = userProfile.discoverFilters;
                const userFiltersKey = `${FILTERS_STORAGE_KEY}_${currentUser.uid}`;
                localStorage.setItem(userFiltersKey, JSON.stringify(filtersToApply));
            } else {
                const userFiltersKey = `${FILTERS_STORAGE_KEY}_${currentUser.uid}`;
                const savedFiltersRaw = localStorage.getItem(userFiltersKey);
                if (savedFiltersRaw) {
                    console.log("Restoring filters from localStorage.");
                    try { filtersToApply = JSON.parse(savedFiltersRaw); } catch (e) { console.error(e); }
                }
            }
            
            if (filtersToApply) {
                setShowMe(filtersToApply.showMe ?? 'Tous');
                setAgeRange(filtersToApply.ageRange ?? [18, 45]);
                if (filtersToApply.date?.from) {
                    setDate({ from: new Date(filtersToApply.date.from), to: filtersToApply.date.to ? new Date(filtersToApply.date.to) : undefined });
                } else {
                    setDate(undefined);
                }
                setFlexibleDates(filtersToApply.flexibleDates ?? true);
                setNearby(filtersToApply.nearby ?? true);
                setCountry(filtersToApply.country ?? '');
                setDestination(filtersToApply.destination ?? 'Toutes');
                setIntention(filtersToApply.intention ?? '');
                setTravelStyle(filtersToApply.travelStyle ?? 'Tous');
                setActivities(filtersToApply.activities ?? 'Toutes');
            }

            setFiltersLoaded(true); // Marque les filtres comme chargés
        }
    }, [userProfile, currentUser, filtersLoaded]);

    const handleNearbyChange = (checked: boolean) => {
        setNearby(checked);
        if (checked) setCountry('');
    };

    const handleFlexibleDatesChange = (checked: boolean) => {
        setFlexibleDates(checked);
        if (checked) setDate(undefined);
    };

    const handleSearch = useCallback(async () => {
        if (!userProfile || !currentUser) {
            console.error('Search aborted. Profile not ready yet.');
            return;
        }

        setIsSearching(true);
        
        const filtersToSave = {
            showMe, ageRange, date: date ? { from: date.from?.toISOString(), to: date.to?.toISOString() } : undefined, 
            flexibleDates, nearby, country, destination, intention, travelStyle, activities
        };

        try {
            // Étape 1 : Sauvegarde fiable dans Firestore
            const saveResult = await updateUserDiscoverFilters(currentUser.uid, filtersToSave);
            if (!saveResult.success) {
                throw new Error(saveResult.error || "La sauvegarde des préférences a échoué.");
            }

            // Étape 2 : Si la sauvegarde réussit, mise à jour du cache local
            const userFiltersKey = `${FILTERS_STORAGE_KEY}_${currentUser.uid}`;
            localStorage.setItem(userFiltersKey, JSON.stringify(filtersToSave));

            // Étape 3 : Lancement de la recherche Algolia
            const index = await getUsersIndex();
            if (!index) throw new Error("Le client de recherche n'a pas pu être initialisé.");

            const nextSearchCount = searchCount + 1;
            incrementSearchCount();
            triggerAdShowOnSearch(nextSearchCount);

            const buildSearchOptions = (isFallback: boolean) => {
                const filters: string[] = [];
                if (showMe && showMe !== 'Tous') filters.push(`gender:"${showMe}"`);
                filters.push(`NOT objectID:${currentUser.uid}`);
                if (userProfile.blockedUsers?.length > 0) {
                    userProfile.blockedUsers.forEach((id: string) => filters.push(`NOT objectID:${id}`));
                }
                if (!isFallback) {
                    if (country && !nearby) filters.push(`location:"${country}"`);
                    if (destination && destination !== 'Toutes') filters.push(`destination:"${destination}"`);
                    if (intention) filters.push(`intention:"${intention}"`);
                    if (travelStyle && travelStyle !== 'Tous') filters.push(`travelStyle:"${travelStyle}"`);
                    if (activities && activities !== 'Toutes') filters.push(`activities:"${activities}"`);
                }
                const searchOptions: any = {
                    filters: filters.join(' AND '),
                    numericFilters: [`age >= ${ageRange[0]}`, `age <= ${ageRange[1]}`],
                    page: 0,
                    hitsPerPage: 20
                };
                if (!isFallback && nearby && userProfile.latitude && userProfile.longitude) {
                    searchOptions.aroundLatLng = `${userProfile.latitude}, ${userProfile.longitude}`;
                    searchOptions.aroundRadius = 50000;
                }
                return searchOptions;
            };

            let searchOptions = buildSearchOptions(false);
            let searchResponse = await index.search('', searchOptions);
            if (searchResponse.hits.length === 0) {
                searchOptions = buildSearchOptions(true);
                searchResponse = await index.search('', searchOptions);
            }
            
            const searchResults = { hits: searchResponse.hits.map((h: any) => ({...h, _highlightResult: undefined})), page: searchResponse.page, nbPages: searchResponse.nbPages, searchOptions };
            localStorage.setItem(`${SEARCH_RESULTS_STORAGE_KEY}_${currentUser.uid}`, JSON.stringify(searchResults));
            router.push('/');

        } catch (error) {
            console.error("Erreur lors de la recherche ou de la sauvegarde:", error);
            toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Une erreur est survenue." });
        } finally {
            setIsSearching(false);
        }
    }, [
        currentUser, userProfile, showMe, ageRange, date, flexibleDates, nearby, country, destination, intention, travelStyle, activities,
        searchCount, incrementSearchCount, triggerAdShowOnSearch, router, toast
    ]);

    useEffect(() => {
        // Effet pour la recherche automatique (après inscription)
        const isNewProfile = searchParams.get('newProfile') === 'true';

        // Ne se déclenche que si les filtres sont chargés et si le profil le permet
        if (isNewProfile && userProfile && filtersLoaded && !hasAutoSearched.current) {
            // La recherche ne part que si l'utilisateur n'a jamais sauvegardé de filtres auparavant.
            if (!userProfile.discoverFilters) {
                hasAutoSearched.current = true;
                console.log("Lancement de la recherche automatique pour le nouveau profil.");
                handleSearch();
            }
        }
    }, [userProfile, filtersLoaded, searchParams, handleSearch]);
    
    const uniformSelectClass = "w-3/5 md:w-[45%] h-9 text-sm";

    if (loading) {
         return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <WanderlinkHeader />
            <main className="pt-12 pb-24">
                <div className="container mx-auto max-w-4xl px-4">
                    <div className="space-y-2 mb-4">
                      <h2 className="font-semibold text-sm">Montre-moi</h2>
                      <div className="flex justify-center">
                        <ToggleGroup
                          type="single"
                          value={showMe}
                          onValueChange={(value) => setShowMe(value || 'Tous')}
                          className="w-auto justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-full"
                        >
                          <ToggleGroupItem value="Homme" aria-label="Montrer les hommes" className="text-sm h-9">Homme</ToggleGroupItem>
                          <ToggleGroupItem value="Femme" aria-label="Montrer les femmes" className="text-sm h-9">Femme</ToggleGroupItem>
                          <ToggleGroupItem value="Autre" aria-label="Montrer les autres" className="text-sm h-9">Autre</ToggleGroupItem>
                          <ToggleGroupItem value="Tous" aria-label="Montrer tout le monde" className="text-sm h-9">Tous</ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card p-3">
                            <AgeRangeSlider value={ageRange} onValueChange={setAgeRange} />
                        </div>

                        <div className="space-y-1">
                            <h2 className="font-semibold text-sm">Position</h2>
                            <div className="rounded-lg border bg-card p-2 space-y-2">
                                <div className="flex items-center justify-between py-1 px-1">
                                    <Label htmlFor="nearby" className="text-sm font-normal">Personnes à proximité</Label>
                                    <Checkbox id="nearby" checked={nearby} onCheckedChange={handleNearbyChange} />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className={cn('text-muted-foreground', nearby && 'opacity-50')}>Pays</span>
                                    <CountrySelect className={uniformSelectClass} value={country} onValueChange={setCountry} disabled={nearby} />

                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className="text-muted-foreground">Destination</span>
                                    <CountrySelect className={uniformSelectClass} value={destination} onValueChange={setDestination} placeholder="Toutes" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                          <h2 className="font-semibold text-sm">Dates de voyage</h2>
                            <div className="rounded-lg border bg-card p-3 space-y-3">
                                <DateRangePicker date={date} onDateChange={setDate} disabled={flexibleDates} />
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="flexible-dates" checked={flexibleDates} onCheckedChange={handleFlexibleDatesChange} />
                                    <Label htmlFor="flexible-dates" className="text-sm">Mes dates sont flexibles</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h2 className="font-semibold text-sm">Filtres Avancés</h2>
                            <div className="rounded-lg border bg-card p-2 space-y-2">
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className='text-muted-foreground'>Intention</span>
                                    <GenericSelect className={uniformSelectClass} value={intention} onValueChange={setIntention} options={[{ value: '', label: 'Toutes' }, ...travelIntentions]} placeholder="Toutes" />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className='text-muted-foreground'>Style de voyage</span>
                                    <GenericSelect className={uniformSelectClass} value={travelStyle} onValue-change={setTravelStyle} options={travelStyles} placeholder="Tous" />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className='text-muted-foreground'>Activités</span>
                                    <GenericSelect className={uniformSelectClass} value={activities} onValue-change={setActivities} options={travelActivities} placeholder="Toutes" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="fixed bottom-0 z-10 w-full p-2 bg-background/80 backdrop-blur-sm border-t">
                <Button onClick={handleSearch} size="lg" className="w-full" disabled={isSearching || loading || !filtersLoaded}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    {isSearching ? 'Recherche...' : (filtersLoaded ? 'Lancer la recherche' : 'Chargement...')}
                </Button>
            </footer>
        </div>
    );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
      <DiscoverClient />
    </Suspense>
  );
}
