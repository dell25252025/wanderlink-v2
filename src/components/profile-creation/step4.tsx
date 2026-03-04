
'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CountrySelect } from '@/components/country-select';
import { GenericSelect } from '@/components/generic-select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { travelIntentions, travelStyles, travelActivities } from '@/lib/options';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import IntentionPicker from './IntentionPicker';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const Step4 = () => {
  const { control, watch, setValue } = useFormContext();
  const flexibleDates = watch('flexibleDates');
  const selectedIntentionValue = watch('intention');
  const [isIntentionPickerOpen, setIsIntentionPickerOpen] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);

  const selectedIntention = travelIntentions.find(i => i.value === selectedIntentionValue);

  useEffect(() => {
    if (isFirstRender) {
        setTimeout(() => setIsIntentionPickerOpen(true), 200);
        setIsFirstRender(false);
    }
  }, [isFirstRender]);

  return (
    <>
      <AnimatePresence>
        {isIntentionPickerOpen && (
          <IntentionPicker
            onSelect={(value) => {
              setValue('intention', value, { shouldValidate: true, shouldDirty: true });
            }}
            onClose={() => setIsIntentionPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
          <div>
              <h2 className="text-2xl font-bold font-headline">Votre prochain voyage</h2>
              <p className="text-muted-foreground">Décrivez votre projet pour trouver les meilleurs partenaires.</p>
          </div>

          {/* Dates de voyage Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Dates de voyage</h3>
            <div className="rounded-lg border bg-card p-4 space-y-4">
                <FormField
                    control={control}
                    name="dates"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                 <DateRangePicker 
                                    date={field.value} 
                                    onDateChange={field.onChange} 
                                    disabled={flexibleDates} 
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
                            <Label htmlFor="flexible-dates">Mes dates sont flexibles</Label>
                        </FormItem>
                    )}
                />
            </div>
        </div>

          {/* Position Section */}
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Destination</h3>
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
        </div>


          {/* Voyage Section */}
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Détails du voyage</h3>
            <div className="rounded-lg border bg-card p-4 space-y-2">
                <FormField
                    control={control}
                    name="intention"
                    render={() => (
                         <FormItem>
                            <Button variant="outline" className="w-full justify-between items-center h-12" onClick={() => setIsIntentionPickerOpen(true)}>
                                <div className="flex flex-col items-start">
                                     <span className="text-xs text-muted-foreground">Intention</span>
                                     {selectedIntention ? (
                                        <div className="flex items-center gap-2 font-semibold">
                                            <span>{selectedIntention.emoji}</span>
                                            <span>{selectedIntention.label}</span>
                                        </div>
                                     ) : (
                                        <span className="text-foreground/80">Sélectionnez...</span>
                                     )}
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                            </Button>
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
      </div>
    </>
  );
};

export default Step4;
