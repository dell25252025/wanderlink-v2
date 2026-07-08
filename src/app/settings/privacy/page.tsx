
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';

import { Eye, MessageSquare, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SettingsHeader } from '@/components/settings/settings-header';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function PrivacySettingsPage() {
  const { currentUser } = useAuth();
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [messagingPolicy, setMessagingPolicy] = useState('all');
  const [photoVisibility, setPhotoVisibility] = useState('all');
  const [friendRequestPolicy, setFriendRequestPolicy] = useState('all');

  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setShowOnlineStatus(userData.showOnlineStatus !== false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleToggleOnlineStatus = async (isActive: boolean) => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        showOnlineStatus: isActive,
        isOnline: isActive,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut en ligne:", error);
    }
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
                            <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={handleToggleOnlineStatus} />
                        </div>
                         {/* La section 'Activité récente' a été supprimée */}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-5 w-5"/> Qui peut voir mes photos ?</CardTitle>
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

            </div>
        </main>
    </div>
  );
}
