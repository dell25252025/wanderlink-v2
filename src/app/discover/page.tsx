
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// IMPORTANT: The Algolia script is loaded via CDN. This is just for type safety.
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
import { getUserProfile } from '@/lib/firebase-actions';
import type { DocumentData } from 'firebase/firestore';
import { Loader2, Search } from 'lucide-react';

declare global {
    interface Window { 
        algoliasearch: typeof algoliasearch;
        __ALGOLIA_APP_ID__: string;
        __ALGOLIA_SEARCH_KEY__: string;
    }
}

// --- STABLE SINGLETON PATTERN --- //
let usersIndexSingleton: ReturnType<ReturnType<typeof algoliasearch>['initIndex']> | null = null;

async function getUsersIndex(): Promise<ReturnType<ReturnType<typeof algoliasearch>['initIndex']> | null> {
  if (usersIndexSingleton) {
    return usersIndexSingleton;
  }

  // Wait for the Algolia script to be loaded
  if (typeof window !== 'undefined' && !window.algoliasearch) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (window.algoliasearch) {
          clearInterval(interval);
          resolve();
        }
      }, 100); // Check every 100ms
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

export default function DiscoverPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const [showMe, setShowMe] = useState('Femme');
    const [ageRange, setAgeRange] = useState<[number, number]>([25, 45]);
    const [date, setDate] = useState<DateRange | undefined>();
    const [flexibleDates, setFlexibleDates] = useState(true);
    const [nearby, setNearby] = useState(true);
    const [country, setCountry] = useState('');
    const [destination, setDestination] = useState('Toutes');
    const [intention, setIntention] = useState('');
    const [travelStyle, setTravelStyle] = useState('Tous');
    const [activities, setActivities] = useState('Toutes');

    useEffect(() => {
        if (!document.querySelector('script[src="https://cdn.jsdelivr.net/npm/algoliasearch@4/dist/algoliasearch-lite.umd.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/algoliasearch@4/dist/algoliasearch-lite.umd.js';
            script.async = true;
            document.body.appendChild(script);
        }

        const authUnsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                getUserProfile(user.uid).then(profile => {
                    setUserProfile(profile);
                    if (profile) {
                        if (profile.gender === 'Femme') setShowMe('Homme');
                        else if (profile.gender === 'Autre') setShowMe('Autre');
                        else setShowMe('Femme');
                    }
                    setLoading(false);
                });
            } else {
                setLoading(false);
                router.push('/login');
            }
        });

        return () => authUnsubscribe();
    }, [router]);

    const handleNearbyChange = (checked: boolean) => {
        setNearby(checked);
        if (checked) {
            setCountry('');
        }
    };

    const handleFlexibleDatesChange = (checked: boolean) => {
        setFlexibleDates(checked);
        if (checked) {
            setDate(undefined);
        }
    };

    const handleSearch = async () => {
        const index = await getUsersIndex();
        if (!index || !userProfile || !currentUser) {
            console.log('Search aborted. Index or profile not ready yet.', { index: !!index, userProfile: !!userProfile, currentUser: !!currentUser });
            return;
        }
        
        setIsSearching(true);
    
        const filters = [];
        if (showMe) filters.push(`gender:"${showMe}"`);
        
        const numericFilters = [];
        numericFilters.push(`age >= ${ageRange[0]}`);
        numericFilters.push(`age <= ${ageRange[1]}`);
    
        if (country && !nearby) filters.push(`location:"${country}"`);
        if (destination && destination !== 'Toutes') filters.push(`destination:"${destination}"`);
        if (intention && intention !== '') filters.push(`intention:"${intention}"`);
        if (travelStyle && travelStyle !== 'Tous') filters.push(`travelStyle:"${travelStyle}"`);
        if (activities && activities !== 'Toutes') filters.push(`activities:"${activities}"`);
    
        filters.push(`NOT objectID:${currentUser.uid}`);
    
        const searchOptions: any = {
            filters: filters.join(' AND '),
            numericFilters: numericFilters.join(' AND '),
        };
    
        if (nearby && userProfile.latitude && userProfile.longitude) {
            searchOptions.aroundLatLng = `${userProfile.latitude}, ${userProfile.longitude}`;
            searchOptions.aroundRadius = 50000; // 50km
        }
    
        console.log("Executing Algolia search with options:", JSON.stringify(searchOptions, null, 2));

        try {
            const { hits } = await index.search('', searchOptions);
            console.log(`Algolia search successful. Received ${hits.length} hits.`);
            const searchResults = hits.map((hit: any) => ({ ...hit, _highlightResult: undefined, _snippetResult: undefined, objectID: undefined }));
            localStorage.setItem('searchResults', JSON.stringify(searchResults));
            router.push('/');
        } catch (error) {
            console.error("Error searching with Algolia:", error);
        } finally {
            setIsSearching(false);
        }
    };
    
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
                          onValueChange={(value) => { if (value) setShowMe(value) }}
                          className="w-auto justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-full"
                        >
                          <ToggleGroupItem value="Homme" aria-label="Montrer les hommes" className="text-sm h-9">Homme</ToggleGroupItem>
                          <ToggleGroupItem value="Femme" aria-label="Montrer les femmes" className="text-sm h-9">Femme</ToggleGroupItem>
                          <ToggleGroupItem value="Autre" aria-label="Montrer les autres" className="text-sm h-9">Autre</ToggleGroupItem>
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
                                    <GenericSelect className={uniformSelectClass} value={travelStyle} onValueChange={setTravelStyle} options={travelStyles} placeholder="Tous" />
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
                <Button onClick={handleSearch} size="lg" className="w-full" disabled={isSearching || loading}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    {isSearching ? 'Recherche...' : 'Lancer la recherche'}
                </Button>
            </footer>
        </div>
    );
}
