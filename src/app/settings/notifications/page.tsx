
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Mail, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { SettingsHeader } from '@/components/settings/settings-header';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for notification settings
  const [pushNotifications, setPushNotifications] = useState({
    newMessages: true,
    profileVisits: true,
    newMatches: true,
  });
  const [emailNotifications, setEmailNotifications] = useState({
    newsAndUpdates: true,
    weeklyDigest: false,
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log({
      pushNotifications,
      emailNotifications,
    });
    
    setIsSubmitting(false);
    toast({
      title: 'Paramètres enregistrés',
      description: 'Vos préférences de notification ont été mises à jour.',
    });
  };

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
                            <Switch id="push-messages" checked={pushNotifications.newMessages} onCheckedChange={(checked) => setPushNotifications(prev => ({...prev, newMessages: checked}))} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="push-visits" className="text-sm">Visites de profil</Label>
                            <Switch id="push-visits" checked={pushNotifications.profileVisits} onCheckedChange={(checked) => setPushNotifications(prev => ({...prev, profileVisits: checked}))} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="push-matches" className="text-sm">Nouveaux matches</Label>
                            <Switch id="push-matches" checked={pushNotifications.newMatches} onCheckedChange={(checked) => setPushNotifications(prev => ({...prev, newMatches: checked}))} />
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
                            <Switch id="email-news" checked={emailNotifications.newsAndUpdates} onCheckedChange={(checked) => setEmailNotifications(prev => ({...prev, newsAndUpdates: checked}))} />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="email-digest" className="text-sm">Résumé hebdomadaire</Label>
                            <Switch id="email-digest" checked={emailNotifications.weeklyDigest} onCheckedChange={(checked) => setEmailNotifications(prev => ({...prev, weeklyDigest: checked}))} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={isSubmitting} size="default">
                         {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enregistrement...
                            </>
                         ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Enregistrer
                            </>
                         )}
                    </Button>
                </div>
            </div>
        </main>
    </div>
  );
}
