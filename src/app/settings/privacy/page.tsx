
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, MessageSquare, Shield, Activity, Save, Loader2, Image as ImageIcon, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { SettingsHeader } from '@/components/settings/settings-header';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for privacy settings - in a real app, this would come from user data
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [messagingPolicy, setMessagingPolicy] = useState('all');
  const [photoVisibility, setPhotoVisibility] = useState('all');
  const [friendRequestPolicy, setFriendRequestPolicy] = useState('all');


  const handleSave = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, you would save these settings to your database.
    console.log({
      showOnlineStatus,
      showRecentActivity,
      messagingPolicy,
      photoVisibility,
      friendRequestPolicy,
    });
    
    setIsSubmitting(false);
    toast({
      title: 'Paramètres enregistrés',
      description: 'Vos préférences de confidentialité ont été mises à jour.',
    });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
        <SettingsHeader title="Confidentialité" />
        <main className="px-2 py-4 md:px-4 pt-16">
            <div className="mx-auto max-w-2xl space-y-4">
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-5 w-5"/> Visibilité</CardTitle>
                        <CardDescription className="text-sm">Contrôlez qui peut voir votre profil.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-0">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="online-status" className="text-sm">Afficher mon statut "En ligne"</Label>
                            <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="recent-activity" className="text-sm">Afficher mon activité récente</Label>
                            <Switch id="recent-activity" checked={showRecentActivity} onCheckedChange={setShowRecentActivity} />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-5 w-5"/> Qui peut voir mes photos ?</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <RadioGroup value={photoVisibility} onValueChange={setPhotoVisibility} className="space-y-2">
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="all" id="p-all" />
                               <Label htmlFor="p-all" className="text-sm font-normal">Tout le monde</Label>
                           </div>
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="friends" id="p-friends" />
                               <Label htmlFor="p-friends" className="text-sm font-normal">Seulement mes amis</Label>
                           </div>
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="none" id="p-none" />
                               <Label htmlFor="p-none" className="text-sm font-normal">Personne</Label>
                           </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-5 w-5"/> Qui peut m'envoyer un message ?</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <RadioGroup value={messagingPolicy} onValueChange={setMessagingPolicy} className="space-y-2">
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="all" id="m-all" />
                               <Label htmlFor="m-all" className="text-sm font-normal">Tout le monde</Label>
                           </div>
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="friends" id="m-friends" />
                               <Label htmlFor="m-friends" className="text-sm font-normal">Seulement mes amis</Label>
                           </div>
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="none" id="m-none" />
                               <Label htmlFor="m-none" className="text-sm font-normal">Personne</Label>
                           </div>
                        </RadioGroup>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-5 w-5"/> Qui peut m'envoyer une demande d'ami ?</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <RadioGroup value={friendRequestPolicy} onValueChange={setFriendRequestPolicy} className="space-y-2">
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="all" id="fr-all" />
                               <Label htmlFor="fr-all" className="text-sm font-normal">Tout le monde</Label>
                           </div>
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="friends" id="fr-friends" />
                               <Label htmlFor="fr-friends" className="text-sm font-normal">Amis de mes amis</Label>
                           </div>
                           <div className="flex items-center space-x-3">
                               <RadioGroupItem value="none" id="fr-none" />
                               <Label htmlFor="fr-none" className="text-sm font-normal">Personne</Label>
                           </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={isSubmitting} size="default">
                         {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sauvegarde...
                            </>
                         ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Sauvegarder
                            </>
                         )}
                    </Button>
                </div>
            </div>
        </main>
    </div>
  );
}
