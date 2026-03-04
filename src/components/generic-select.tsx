'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

// --- Interfaces --- //
export interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface GenericSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultOpen?: boolean; // <-- Nouvelle prop
}

// --- Sous-composant : La liste des options --- //
function OptionList({
  value,
  setOpen,
  onValueChange,
  options,
}: {
  value: string;
  setOpen: (open: boolean) => void;
  onValueChange: (value: string) => void;
  options: Option[];
}) {
  const [search, setSearch] = React.useState('');

  const filteredOptions = React.useMemo(
    () =>
      options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
      ),
    [search, options]
  );

  return (
    <div className="flex flex-col">
      <div className="p-2 border-b">
        <Input
          placeholder="Filtrer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto p-1">
        {filteredOptions.length === 0 ? (
          <p className="p-4 text-sm text-center text-muted-foreground">Aucun résultat.</p>
        ) : (
          filteredOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onValueChange(option.value === value ? '' : option.value);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left p-2 text-sm flex items-center gap-2 rounded-md hover:bg-accent',
                value === option.value && 'bg-orange-200 dark:bg-orange-800'
              )}
            >
              {option.icon && <span className="text-lg">{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// --- Composant Principal : Le sélecteur responsive --- //
export function GenericSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Sélectionner une option',
  disabled,
  className,
  defaultOpen = false, // <-- Utilisation de la nouvelle prop
}: GenericSelectProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const selectedOption = options.find((option) => option.value === value);

  const triggerContent = (
    <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
      {selectedOption ? (
        <>
          {selectedOption.icon && <span className="text-lg">{selectedOption.icon}</span>}
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {selectedOption.label}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
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
          <OptionList value={value} setOpen={setOpen} onValueChange={onValueChange} options={options} />
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
          <DrawerTitle>{placeholder}</DrawerTitle>
        </DrawerHeader>
        <OptionList value={value} setOpen={setOpen} onValueChange={onValueChange} options={options} />
      </DrawerContent>
    </Drawer>
  );
}
