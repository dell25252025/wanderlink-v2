
"use client";

import { useState, useEffect } from 'react';
import ProfileCard from '@/components/profile-card';
import { Loader2, UserX } from 'lucide-react';
import { DocumentData } from 'firebase/firestore';
import { UserProfile } from '@/lib/schema';
import { addFriend, getUsersOnlineStatus } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface DiscoverClientPageProps {
  initialProfiles: DocumentData[];
  loading: boolean;
  currentUserProfile: DocumentData | null;
}

export default function DiscoverClientPage({ initialProfiles, loading, currentUserProfile }: DiscoverClientPageProps) {
  const [profiles, setProfiles] = useState<DocumentData[]>(initialProfiles);
  const [friends, setFriends] = useState<string[]>([]);
  const [isAddingFriend, setIsAddingFriend] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Affiche immédiatement les profils d'Algolia
    setProfiles(initialProfiles.map(p => ({ ...p, isOnline: false })));

    // Puis, enrichit avec le statut en ligne
    if (initialProfiles.length > 0) {
      const uids = initialProfiles.map(p => p.uid || p.objectID).filter(Boolean);
      
      getUsersOnlineStatus(uids).then(onlineStatuses => {
        setProfiles(currentProfiles => 
          currentProfiles.map(p => ({
            ...p,
            isOnline: onlineStatuses[p.uid || p.objectID] || false,
          }))
        );
      });
    }
  }, [initialProfiles]);

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.friends) {
      setFriends(currentUserProfile.friends);
    }
  }, [currentUserProfile]);

  const handleAddFriend = async (friendId: string) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Vous devez être connecté pour ajouter des amis.' });
      return;
    }

    setIsAddingFriend(friendId);
    try {
      const result = await addFriend(currentUser.uid, friendId);
      if (result.success) {
        setFriends(prev => [...prev, friendId]);
        toast({ title: 'Ami ajouté avec succès!' });
      } else {
        throw new Error(result.error || "Impossible d'ajouter cet ami.");
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
      setIsAddingFriend(null);
    }
  };

  const mappedProfiles: UserProfile[] = profiles.map(p => ({
    id: p.uid || p.objectID,
    name: p.firstName,
    age: p.age,
    gender: p.gender,
    bio: p.bio,
    location: p.location || 'N/A',
    travelStyle: p.travelStyle || 'Tous',
    dreamDestinations: [p.destination] || ['Toutes'],
    languagesSpoken: p.languages || [],
    travelIntention: p.intention || '50/50',
    verified: p.isVerified ?? false,
    isVerified: p.isVerified ?? false,
    isOnline: p.isOnline,
    image: p.profilePictures?.[0] || `https://picsum.photos/seed/${p.uid || p.objectID}/800/1200`
  }));

  // Condition d'affichage modifiée
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-96">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <h2 className="mt-6 text-2xl font-semibold">Chargement des profils...</h2>
      </div>
    );
  }

  if (initialProfiles.length === 0 && !loading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center text-center px-4">
        <UserX className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-bold">Aucun résultat</h2>
        <p className="mt-2 text-muted-foreground">Essayez d'élargir vos critères de recherche.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
      {mappedProfiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          isFriend={friends.includes(profile.id)}
          onAddFriend={handleAddFriend}
          currentUserId={currentUser?.uid || null}
          isAddingFriend={isAddingFriend === profile.id}
        />
      ))}
    </div>
  );
}
