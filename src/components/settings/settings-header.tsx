'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsHeaderProps {
  title: string;
}

export const SettingsHeader = ({ title }: SettingsHeaderProps) => {
  const router = useRouter();

  return (
    <header className="fixed top-0 z-20 w-full h-12 flex items-center justify-between border-b bg-background/95 px-2 py-1 backdrop-blur-sm md:px-4">
      <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8 -ml-2">
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">Retour</span>
      </Button>
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="w-8"></div>
    </header>
  );
};
