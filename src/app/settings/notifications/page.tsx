'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore'; // Ajout de updateDoc

import { Bell, Mail, Heart, Phone, PhoneMissed } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SettingsHeader } from '@/components/settings/settings-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationSettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [videoCallsEnabled, setVideoCallsEnabled] = useState(true);
  const [missedCallsEnabled, setMissedCallsEnabled] = useState(true);
  const [profileVisitsEnabled, setProfileVisitsEnabled] = useState(true);
  const [friendRequestsEnabled, setFriendRequestsEnabled] = useState(true);
  const [friendAcceptsEnabled, setFriendAcceptsEnabled] = useState(true);
  const [photoLikesEnabled, setPhotoLikesEnabled] = useState(true);

  // Mocks
  const [mockEmail, setMockEmail] = useState({ newsAndUpdates: true, weeklyDigest: false });

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const settings = data.notificationSettings || {};
        setMessagesEnabled(settings.messages ?? true);
        setVideoCallsEnabled(settings.videoCalls ?? true);
        setMissedCallsEnabled(settings.missedCalls ?? true);
        setProfileVisitsEnabled(settings.profileVisits ?? true);
        setFriendRequestsEnabled(settings.friendRequests ?? true);
        setFriendAcceptsEnabled(settings.friendAccepts ?? true);
        setPhotoLikesEnabled(settings.photoLikes ?? true);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const createToggleHandler = (setter: React.Dispatch<React.SetStateAction<boolean>>, settingName: string) => {
    return async (checked: boolean) => {
      if (!currentUser?.uid) return;
      setter(checked);
      const userRef = doc(db, 'users', currentUser.uid);
      try {
        // Correction: Utilisation de updateDoc avec la notation par points pour ne mettre à jour que le champ spécifique.
        await updateDoc(userRef, {
          [`notificationSettings.${settingName}`]: checked
        });
        toast({ title: 'Préférences mises à jour' });
      } catch (error) {
        console.error(`Erreur pour ${settingName}:`, error);
        toast({ title: 'Erreur', description: 'La modification n\'a pas pu être enregistrée.', variant: 'destructive' });
        setter(!checked); // Rétablir en cas d'erreur
      }
    };
  };

  const handleToggleMessages = createToggleHandler(setMessagesEnabled, 'messages');
  const handleToggleVideoCalls = createToggleHandler(setVideoCallsEnabled, 'videoCalls');
  const handleToggleMissedCalls = createToggleHandler(setMissedCallsEnabled, 'missedCalls');
  const handleToggleProfileVisits = createToggleHandler(setProfileVisitsEnabled, 'profileVisits');
  const handleToggleFriendRequests = createToggleHandler(setFriendRequestsEnabled, 'friendRequests');
  const handleToggleFriendAccepts = createToggleHandler(setFriendAcceptsEnabled, 'friendAccepts');
  const handleTogglePhotoLikes = createToggleHandler(setPhotoLikesEnabled, 'photoLikes');


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
               <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-video-calls" className="flex items-center text-sm">
                    <Phone className="mr-2 h-4 w-4" /> Appels vidéo entrants
                </Label>
                <Switch 
                  id="push-video-calls" 
                  checked={videoCallsEnabled}
                  onCheckedChange={handleToggleVideoCalls}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-missed-calls" className="flex items-center text-sm">
                    <PhoneMissed className="mr-2 h-4 w-4 text-red-500" /> Appels manqués
                </Label>
                <Switch 
                  id="push-missed-calls" 
                  checked={missedCallsEnabled}
                  onCheckedChange={handleToggleMissedCalls}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-visits" className="text-sm">Visites de profil</Label>
                <Switch 
                  id="push-visits" 
                  checked={profileVisitsEnabled}
                  onCheckedChange={handleToggleProfileVisits}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-friend-requests" className="text-sm">Demandes d'ami</Label>
                <Switch 
                  id="push-friend-requests" 
                  checked={friendRequestsEnabled}
                  onCheckedChange={handleToggleFriendRequests}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-friend-accepts" className="text-sm">Acceptations d'ami</Label>
                <Switch 
                  id="push-friend-accepts" 
                  checked={friendAcceptsEnabled}
                  onCheckedChange={handleToggleFriendAccepts}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="push-photo-likes" className="flex items-center text-sm">
                  <Heart className="mr-2 h-4 w-4 text-red-500" /> J'aime sur les photos
                </Label>
                <Switch 
                  id="push-photo-likes" 
                  checked={photoLikesEnabled}
                  onCheckedChange={handleTogglePhotoLikes}
                />
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
