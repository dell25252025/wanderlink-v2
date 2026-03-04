
'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Step3 = () => {
  const { control } = useFormContext();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold font-headline">Quelques détails</h2>
        <p className="text-muted-foreground">Ces informations sont optionnelles mais favorisent des connexions plus authentiques.</p>
      </div>
      <div className="space-y-4">
        <FormField
          control={control}
          name="tobacco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tabac</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Non-fumeur">Non-fumeur</SelectItem>
                  <SelectItem value="Occasionnellement">Occasionnellement</SelectItem>
                  <SelectItem value="Régulièrement">Régulièrement</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="alcohol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alcool</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Jamais">Jamais</SelectItem>
                  <SelectItem value="Occasionnellement">Occasionnellement</SelectItem>
                  <SelectItem value="Souvent">Souvent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="cannabis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cannabis</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Non-fumeur">Non-fumeur</SelectItem>
                  <SelectItem value="Occasionnellement">Occasionnellement</SelectItem>
                  <SelectItem value="Régulièrement">Régulièrement</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default Step3;
