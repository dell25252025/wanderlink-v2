'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/use-media-query';
import { countries } from '@/lib/countries';
import { cn } from '@/lib/utils';

// Interface des props
interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string; // Ajout de la prop placeholder
}

// Le composant qui affiche la liste des pays
function CountryList({
  value,
  setOpen,
  onValueChange,
  placeholder,
}: {
  value: string;
  setOpen: (open: boolean) => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = React.useState('');

  const filteredCountries = React.useMemo(
    () =>
      countries.filter((country) =>
        country.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  return (
    <div className="flex flex-col">
      <div className="p-2 border-b">
        <Input
          placeholder="Filtrer les pays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto p-1">
        {/* Bouton pour l'option "placeholder" (ex: "Toutes") */}
        {placeholder && (
          <button
            type="button" // Correction: Ajout de type="button"
            onClick={() => {
              onValueChange(placeholder);
              setOpen(false);
            }}
            className={cn(
              'w-full text-left p-2 text-sm flex items-center gap-2 rounded-md hover:bg-accent',
              value === placeholder && 'bg-orange-200 dark:bg-orange-800'
            )}
          >
            <span>{placeholder}</span>
          </button>
        )}
        {/* Liste des pays */}
        {filteredCountries.length === 0 && !placeholder ? (
          <p className="p-4 text-sm text-center text-muted-foreground">Aucun résultat.</p>
        ) : (
          filteredCountries.map((country) => (
            <button
              type="button" // Correction: Ajout de type="button"
              key={country.code}
              onClick={() => {
                onValueChange(country.name);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left p-2 text-sm flex items-center gap-2 rounded-md hover:bg-accent',
                value === country.name && 'bg-orange-200 dark:bg-orange-800'
              )}
            >
              <span className={`fi fi-${country.code.toLowerCase()}`}></span>
              <span>{country.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// Le composant principal qui gère l'affichage responsive
export function CountrySelect({ value, onValueChange, disabled, className, placeholder }: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const selectedCountry = countries.find((country) => country.name === value);

  const triggerContent = (
    <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
      {selectedCountry ? (
        <>
          <span className={`fi fi-${selectedCountry.code.toLowerCase()} shrink-0`}></span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{selectedCountry.name}</span>
        </>
      ) : (
        <span className="text-muted-foreground">{value || placeholder || "Sélectionner un pays"}</span>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-[200px] justify-start', className)}
            disabled={disabled}
          >
            {triggerContent}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <CountryList value={value} setOpen={setOpen} onValueChange={onValueChange} placeholder={placeholder} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-start', className)}
          disabled={disabled}
        >
          {triggerContent}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>Sélectionner un pays</DrawerTitle>
        </DrawerHeader>
        <CountryList value={value} setOpen={setOpen} onValueChange={onValueChange} placeholder={placeholder} />
      </DrawerContent>
    </Drawer>
  );
}
