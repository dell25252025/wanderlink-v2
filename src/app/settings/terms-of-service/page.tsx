
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
       <header className="fixed top-0 z-20 w-full h-12 flex items-center justify-between border-b bg-background/95 px-2 py-1 backdrop-blur-sm md:px-4">
        <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <h1 className="text-sm font-semibold">Conditions d'utilisation</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 overflow-hidden pt-12">
        <ScrollArea className="h-full">
          <div className="space-y-6 px-2 py-4 md:px-4">
            <div className="mx-auto max-w-2xl space-y-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5"/> Conditions Générales d'Utilisation</CardTitle>
                  <CardDescription className="text-sm">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0 text-sm text-muted-foreground">
                  <p>Veuillez lire attentivement ces conditions d'utilisation avant d'utiliser l'application WanderLink. En accédant ou en utilisant le service, vous acceptez d'être lié par ces conditions.</p>
                  
                  <h3 className="font-semibold text-foreground text-base">1. Utilisation du Service</h3>
                  <p>WanderLink vous fournit une plateforme pour vous connecter avec d'autres voyageurs. Vous acceptez d'utiliser le service de manière responsable et de ne pas l'utiliser à des fins illégales ou non autorisées. Vous êtes responsable de votre conduite et de tout contenu que vous publiez.</p>

                  <h3 className="font-semibold text-foreground text-base">2. Contenu Utilisateur</h3>
                  <p>Vous conservez tous vos droits sur le contenu que vous soumettez, publiez ou affichez sur ou via le service. En soumettant du contenu, vous nous accordez une licence mondiale, non exclusive et libre de droits pour utiliser, copier, reproduire, traiter, adapter, modifier, publier, transmettre, afficher et distribuer ce contenu.</p>

                  <h3 className="font-semibold text-foreground text-base">3. Résiliation</h3>
                  <p>Nous pouvons résilier ou suspendre votre accès à notre service immédiatement, sans préavis ni responsabilité, pour quelque raison que ce soit, y compris, sans s'y limiter, si vous ne respectez pas les conditions.</p>

                  <h3 className="font-semibold text-foreground text-base">4. Limitation de responsabilité</h3>
                  <p>En aucun cas WanderLink, ni ses administrateurs, employés, partenaires, agents, fournisseurs ou affiliés, ne seront responsables des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs résultant de votre accès ou de votre utilisation du service.</p>

                  <h3 className="font-semibold text-foreground text-base">5. Modifications</h3>
                  <p>Nous nous réservons le droit, à notre seule discrétion, de modifier ou de remplacer ces conditions à tout moment. Nous vous informerons de tout changement en publiant les nouvelles conditions sur cette page.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
