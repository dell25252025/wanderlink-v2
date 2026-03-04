'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps extends React.ComponentProps<"div"> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  disabled?: boolean; // Add disabled prop
}

export function DateRangePicker({ className, date, onDateChange, disabled }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(date);
  const [numberOfMonths, setNumberOfMonths] = React.useState(2);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setNumberOfMonths(1);
      } else {
        setNumberOfMonths(2);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    setSelectedDate(date);
  }, [date]);

  const handleApply = () => {
    onDateChange(selectedDate);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedDate(date);
    setIsOpen(false);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={disabled} // Pass disabled prop to Button
            className={cn(
              'w-full justify-start text-left font-normal h-8 md:h-10 text-xs md:text-sm',
              !date && 'text-muted-foreground',
              disabled && 'cursor-not-allowed opacity-50' // Add disabled styles
            )}
          >
            <div className="flex items-center w-full min-w-0">
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                {
                date?.from ? (
                    date.to ? (
                    <>
                        {format(date.from, 'dd/MM/yy', { locale: fr })} -{' '}
                        {format(date.to, 'dd/MM/yy', { locale: fr })}
                    </>
                    ) : (
                    format(date.from, 'dd/MM/yy', { locale: fr })
                    )
                ) : (
                    <span>Choisissez une période</span>
                )
                }
                </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedDate?.from}
            selected={selectedDate}
            onSelect={setSelectedDate}
            numberOfMonths={numberOfMonths}
            locale={fr}
          />
          <div className="flex justify-end space-x-2 p-2 border-t">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>Annuler</Button>
            <Button type="button" size="sm" onClick={handleApply}>OK</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
