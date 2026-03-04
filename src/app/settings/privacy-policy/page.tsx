
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
       <header className="fixed top-0 z-20 w-full h-12 flex items-center justify-between border-b bg-background/95 px-2 py-1 backdrop-blur-sm md:px-4">
        <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <h1 className="text-sm font-semibold">Politique de confidentialité</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 overflow-hidden pt-12">
        <ScrollArea className="h-full">
          <div className="space-y-6 px-2 py-4 md:px-4">
            <div className="mx-auto max-w-2xl space-y-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5"/> Notre engagement</CardTitle>
                  <CardDescription className="text-sm">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0 text-sm text-muted-foreground">
                  <p>Bienvenue sur la politique de confidentialité de WanderLink. Votre vie privée est une priorité pour nous. Ce document explique quelles informations nous collectons, comment nous les utilisons et les choix que vous avez concernant vos données.</p>
                  
                  <h3 className="font-semibold text-foreground text-base">1. Informations que nous collectons</h3>
                  <p>Nous collectons les informations que vous nous fournissez directement, telles que votre nom, votre adresse e-mail, votre âge et les détails de votre profil. Nous collectons également des informations automatiquement lorsque vous utilisez notre service, comme votre adresse IP et vos informations de navigation.</p>

                  <h3 className="font-semibold text-foreground text-base">2. Comment nous utilisons vos informations</h3>
                  <p>Vos informations sont utilisées pour fournir et améliorer nos services, pour vous mettre en relation avec d'autres voyageurs, pour communiquer avec vous et pour assurer la sécurité de notre plateforme. Nous ne partageons pas vos informations personnelles avec des tiers à des fins de marketing sans votre consentement.</p>

                  <h3 className="font-semibold text-foreground text-base">3. Vos droits et choix</h3>
                  <p>Vous avez le droit d'accéder, de corriger ou de supprimer vos informations personnelles à tout moment. Vous pouvez gérer vos préférences de confidentialité directement depuis les paramètres de votre compte.</p>
                  
                  <h3 className="font-semibold text-foreground text-base">4. Sécurité des données</h3>
                  <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre l'accès non autorisé, la modification, la divulgation ou la destruction.</p>

                  <h3 className="font-semibold text-foreground text-base">5. Nous contacter</h3>
                  <p>Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à <a href="mailto:privacy@wanderlink.app" className="text-primary underline">privacy@wanderlink.app</a>.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
