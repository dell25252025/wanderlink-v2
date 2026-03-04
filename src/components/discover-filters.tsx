
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Search } from 'lucide-react';

const DiscoverFilters = () => {
    // In a real app, these state values would be lifted up or managed with a state manager
    // to actually filter the content on the main page.
    const [destination, setDestination] = useState('');
    const [gender, setGender] = useState('all');
    const [intention, setIntention] = useState('all');

    const handleApplyFilters = () => {
        // This is where you would trigger the filtering logic
        console.log({
            destination,
            gender,
            intention,
        });
        // You would likely close the sheet and update the list of profiles on the main page.
    };
    
    const handleResetFilters = () => {
        setDestination('');
        setGender('all');
        setIntention('all');
         console.log('Filters reset');
    }

    return (
        <>
            <SheetHeader>
                <SheetTitle>Filtrer les profils</SheetTitle>
                <SheetDescription>
                    Affinez votre recherche pour trouver le partenaire de voyage idéal.
                </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 py-6">
                <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <Input 
                        id="destination" 
                        placeholder="Pays, ville..." 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Genre</Label>
                    <RadioGroup value={gender} onValueChange={setGender} className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="g-all" />
                            <Label htmlFor="g-all">Tous</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Homme" id="g-male" />
                            <Label htmlFor="g-male">Homme</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Femme" id="g-female" />
                            <Label htmlFor="g-female">Femme</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Non-binaire" id="g-other" />
                            <Label htmlFor="g-other">Non-binaire</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2">
                    <Label>Intention de voyage</Label>
                     <Select value={intention} onValueChange={setIntention}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une intention" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes les intentions</SelectItem>
                            <SelectItem value="Partager les frais (50/50)">Partager les frais (50/50)</SelectItem>
                            <SelectItem value="Je peux sponsoriser le voyage">Sponsoriser un voyage</SelectItem>
                            <SelectItem value="Je cherche un voyage sponsorisé">Chercher un sponsor</SelectItem>
                            <SelectItem value="Organiser un voyage de groupe">Voyage de groupe</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <SheetFooter className="absolute bottom-4 right-4 left-4">
                 <Button variant="ghost" onClick={handleResetFilters}>Réinitialiser</Button>
                <SheetClose asChild>
                    <Button onClick={handleApplyFilters}>
                        <Search className="mr-2 h-4 w-4" />
                        Appliquer les filtres
                    </Button>
                </SheetClose>
            </SheetFooter>
        </>
    );
};

export default DiscoverFilters;
