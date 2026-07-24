'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
// REPRODUCTION DE L'ARCHITECTURE DE LA PAGE CONFIDENTIALITÉ
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

import { Bell, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SettingsHeader } from '@/components/settings/settings-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationSettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  // L'état local pour l'interrupteur "Nouveaux messages"
  const [messagesEnabled, setMessagesEnabled] = useState(true);

  // États pour les maquettes des autres interrupteurs (inchangés)
  const [mockPush, setMockPush] = useState({ profileVisits: true, newMatches: true });
  const [mockEmail, setMockEmail] = useState({ newsAndUpdates: true, weeklyDigest: false });

  // LECTURE DES DONNÉES : Reproduction de la méthode onSnapshot
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Si notificationSettings.messages n'existe pas, la valeur par défaut est true
        setMessagesEnabled(data.notificationSettings?.messages ?? true);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // ÉCRITURE DES DONNÉES : Reproduction de la méthode updateDoc
  const handleToggleMessages = async (checked: boolean) => {
    if (!currentUser?.uid) {
      toast({ title: 'Erreur', description: 'Utilisateur non authentifié.', variant: 'destructive' });
      return;
    }

    // Mise à jour de l'état local pour une réactivité immédiate
    setMessagesEnabled(checked);

    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        'notificationSettings.messages': checked
      });
      toast({ title: 'Préférences mises à jour' });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des paramètres de notification:", error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder votre préférence.', variant: 'destructive' });
      // En cas d'erreur, on revient à l'état précédent
      setMessagesEnabled(!checked);
    }
  };

  if (isLoading) {
    return <NotificationSettingsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <SettingsHeader title="Notifications" />
      <main className="px-2 py-4 md:px-4 pt-16">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-5 w-5" /> Notifications Push</CardTitle>
              <CardDescription className="text-sm">Recevez des alertes en temps réel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-messages" className="text-sm">Nouveaux messages</Label>
                <Switch 
                  id="push-messages" 
                  checked={messagesEnabled}
                  onCheckedChange={handleToggleMessages} 
                />
              </div>
              {/* Les interrupteurs suivants restent des maquettes */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-visits" className="text-sm">Visites de profil</Label>
                <Switch id="push-visits" checked={mockPush.profileVisits} onCheckedChange={(checked) => setMockPush(prev => ({...prev, profileVisits: checked}))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-matches" className="text-sm">Nouveaux matches</Label>
                <Switch id="push-matches" checked={mockPush.newMatches} onCheckedChange={(checked) => setMockPush(prev => ({...prev, newMatches: checked}))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-5 w-5" /> Notifications par e-mail</CardTitle>
              <CardDescription className="text-sm">Recevez des résumés dans votre boîte de réception.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="email-news" className="text-sm">Promotions & actualités</Label>
                <Switch id="email-news" checked={mockEmail.newsAndUpdates} onCheckedChange={(checked) => setMockEmail(prev => ({...prev, newsAndUpdates: checked}))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="email-digest" className="text-sm">Résumé hebdomadaire</Label>
                <Switch id="email-digest" checked={mockEmail.weeklyDigest} onCheckedChange={(checked) => setMockEmail(prev => ({...prev, weeklyDigest: checked}))} />
              </div>
            </CardContent>
          </Card>

          {/* LE BOUTON ENREGISTRER A ÉTÉ SUPPRIMÉ */}
        </div>
      </main>
    </div>
  );
}

function NotificationSettingsSkeleton() {
  return (
     <div className="min-h-screen bg-secondary/30">
      <SettingsHeader title="Notifications" />
      <main className="px-2 py-4 md:px-4 pt-16">
        <div className="mx-auto max-w-2xl space-y-4">
           <Card>
             <CardHeader className="p-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <Skeleton className="h-[68px] w-full rounded-lg" />
              <Skeleton className="h-[68px] w-full rounded-lg" />
              <Skeleton className="h-[68px] w-full rounded-lg" />
            </CardContent>
          </Card>
           <Card>
             <CardHeader className="p-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <Skeleton className="h-[68px] w-full rounded-lg" />
              <Skeleton className="h-[68px] w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
