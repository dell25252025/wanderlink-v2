'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface AgeRangeSliderProps {
  className?: string;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function AgeRangeSlider({ 
    className, 
    value,
    onValueChange,
    min = 18,
    max = 75,
    step = 1 
}: AgeRangeSliderProps) {
    const [localValue, setLocalValue] = React.useState(value);

    // Update local state when the prop value changes
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleValueChange = (newValue: number[]) => {
        setLocalValue([newValue[0], newValue[1]]);
    };

    const handleCommit = (newValue: number[]) => {
        onValueChange([newValue[0], newValue[1]]);
    };

  return (
    <div className={cn('grid gap-4', className)}>
        <div className="flex justify-between items-center">
            <h2 className="font-semibold">Tranche d'âge</h2>
            <span className="text-sm text-muted-foreground">
                {localValue[0]} - {localValue[1]}{localValue[1] === max ? ' ans et +' : ' ans'}
            </span>
        </div>
      <Slider
        value={localValue}
        onValueChange={handleValueChange}
        onValueCommit={handleCommit}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={1}
        className="h-6"
      />
    </div>
  );
}
