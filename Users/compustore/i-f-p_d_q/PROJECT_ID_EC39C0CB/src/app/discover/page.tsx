
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import algoliasearch from 'algoliasearch/lite';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';


// Initialize Algolia
const getAlgoliaConfig = httpsCallable(functions, 'getAlgoliaConfig');

export default function DiscoverPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [algoliaConfig, setAlgoliaConfig] = useState<{ appId: string, searchKey: string } | null>(null);
    const [isSearching, setIsSearching] = useState(false);


    const algoliaClient = useMemo(() => {
        if (algoliaConfig) {
            return algoliasearch(algoliaConfig.appId, algoliaConfig.searchKey);
        }
        return null;
    }, [algoliaConfig]);

    const usersIndex = useMemo(() => {
        if (algoliaClient) {
            return algoliaClient.initIndex("users");
        }
        return null;
    }, [algoliaClient]);

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
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                getUserProfile(user.uid).then(profile => {
                    setUserProfile(profile);
                    if (profile) {
                         if (profile.gender === 'Femme') {
                            setShowMe('Homme');
                        } else if (profile.gender === 'Autre') {
                            setShowMe('Autre');
                        } else {
                            setShowMe('Femme');
                        }
                    }
                    setLoading(false);
                });

                getAlgoliaConfig()
                    .then((result) => {
                        setAlgoliaConfig(result.data as any);
                    })
                    .catch((error) => {
                        console.error("Error fetching Algolia config:", error);
                    });

            } else {
                setLoading(false);
                router.push('/login');
            }
        });
        return () => unsubscribe();
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
        if (!usersIndex || !userProfile || !currentUser) {
            toast({ variant: 'destructive', title: 'Erreur', description: "La recherche n'est pas prête. Veuillez réessayer."});
            return;
        }
        setIsSearching(true);
    
        // Hard filters: gender is always a strict requirement.
        const filters: string[] = [];
        if (showMe) {
            filters.push(`gender:"${showMe}"`);
        }
        filters.push(`NOT objectID:${currentUser.uid}`);
    
        // Numeric filters: Age is a hard filter, but we include profiles without an age set.
        const numericFilters: string[] = [];
        numericFilters.push(`(age >= ${ageRange[0]} AND age <= ${ageRange[1]}) OR age = -1`);
        
        // Optional filters: These will influence ranking but not exclude results.
        const optionalFilters: string[] = [];
        if (country && !nearby) {
            optionalFilters.push(`location:"${country}"`);
        }
        if (destination && destination !== 'Toutes') {
            optionalFilters.push(`destination:"${destination}"`);
        }
        if (intention && intention !== '') {
            optionalFilters.push(`intention:"${intention}"`);
        }
        if (travelStyle && travelStyle !== 'Tous') {
            optionalFilters.push(`travelStyle:"${travelStyle}"`);
        }
        if (activities && activities !== 'Toutes') {
            optionalFilters.push(`activities:"${activities}"`);
        }
    
        const searchOptions: any = {
            filters: filters.join(' AND '),
            numericFilters,
            optionalFilters,
        };
    
        if (nearby && userProfile.latitude && userProfile.longitude) {
            searchOptions.aroundLatLng = `${userProfile.latitude}, ${userProfile.longitude}`;
            searchOptions.aroundRadius = 50000; // 50km radius in meters
        }
        
        console.log("Algolia search options:", JSON.stringify(searchOptions, null, 2));
    
        try {
            const { hits, nbHits } = await usersIndex.search('', searchOptions);
            console.log(`Algolia search found ${nbHits} hits.`);
            const searchResults = hits.map((hit: any) => {
                const { _highlightResult, _snippetResult, ...rest } = hit;
                return { id: hit.objectID, ...rest };
            });

            localStorage.setItem('searchResults', JSON.stringify(searchResults));
            localStorage.setItem('searchTimestamp', Date.now().toString());

            toast({
                title: 'Recherche terminée !',
                description: `${nbHits} profil(s) trouvé(s). Affichage des résultats.`,
            })
            router.push('/');
        } catch (error) {
            console.error("Error searching with Algolia:", error);
            toast({ variant: 'destructive', title: 'Erreur de recherche', description: "Une erreur est survenue lors de la recherche."});
        } finally {
            setIsSearching(false);
        }
    };
    
    
    const uniformSelectClass = "w-3/5 md:w-[45%] h-9 text-sm";

    if (loading || !algoliaConfig) {
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
                     {/* Montre-moi Section */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm">Montre-moi</h2>
                      </div>
                      <div className="flex justify-center">
                        <ToggleGroup
                          type="single"
                          value={showMe}
                          onValueChange={(value) => { if (value) setShowMe(value) }}
                          className="w-auto justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-full"
                          variant='outline'
                          size="default"
                        >
                          <ToggleGroupItem value="Homme" aria-label="Montrer les hommes" className="text-sm h-9">Homme</ToggleGroupItem>
                          <ToggleGroupItem value="Femme" aria-label="Montrer les femmes" className="text-sm h-9">Femme</ToggleGroupItem>
                          <ToggleGroupItem value="Autre" aria-label="Montrer les autres personnes" className="text-sm h-9">Autre</ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                
                    <div className="space-y-4">
                        {/* Age Section */}
                        <div className="rounded-lg border bg-card p-3">
                            <AgeRangeSlider
                                value={ageRange}
                                onValueChange={setAgeRange}
                                className="text-sm"
                            />
                        </div>

                        {/* Position Section */}
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
                                    <CountrySelect 
                                        className={uniformSelectClass} 
                                        value={destination} 
                                        onValueChange={setDestination} 
                                        placeholder="Toutes"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dates de voyage Section */}
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

                        {/* Voyage Section */}
                        <div className="space-y-1">
                            <h2 className="font-semibold text-sm">Filtres Avancés</h2>
                            <div className="rounded-lg border bg-card p-2 space-y-2">
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className='text-muted-foreground'>Intention</span>
                                    <GenericSelect 
                                        className={uniformSelectClass}
                                        value={intention} 
                                        onValueChange={setIntention} 
                                        options={[{ value: '', label: 'Toutes' }, ...travelIntentions]}
                                        placeholder="Toutes"
                                    />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className='text-muted-foreground'>Style de voyage</span>
                                    <GenericSelect 
                                        className={uniformSelectClass}
                                        value={travelStyle} 
                                        onValueChange={setTravelStyle} 
                                        options={travelStyles} 
                                        placeholder="Tous"
                                    />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-1 px-1 text-sm">
                                    <span className='text-muted-foreground'>Activités</span>
                                    <GenericSelect 
                                        className={uniformSelectClass}
                                        value={activities} 
                                        onValueChange={setActivities} 
                                        options={travelActivities} 
                                        placeholder="Toutes"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
            <footer className="fixed bottom-0 z-10 w-full p-2 bg-background/80 backdrop-blur-sm border-t">
                <Button onClick={handleSearch} size="lg" className="w-full" disabled={isSearching}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    {isSearching ? 'Recherche...' : 'Recherche'}
                </Button>
            </footer>
        </div>
    );
}
