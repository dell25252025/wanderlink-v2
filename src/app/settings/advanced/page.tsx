'use client';

import { SettingsHeader } from '@/components/settings/settings-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdvancedSettingsPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <SettingsHeader title="Paramètres avancés" />
      <main className="px-2 py-4 md:px-4 pt-16">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card className="border-destructive/50">
            <Link href="/settings/delete-account" className="block hover:bg-destructive/10">
              <CardHeader className="flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', 'bg-red-100 dark:bg-red-900/50')}>
                    <Trash2 className={cn('h-4 w-4', 'text-red-500')} />
                  </div>
                  <div>
                    <CardTitle className="text-base text-destructive">Supprimer le compte</CardTitle>
                    <CardDescription className="text-sm">Suppression permanente de votre compte et de vos données.</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
              </CardHeader>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
