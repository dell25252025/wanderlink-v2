
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

export default function DiscoverClientPage({ initialProfiles: serverProfiles, loading, currentUserProfile }: DiscoverClientPageProps) {
  // 1. Initialize state with server profiles to prevent hydration errors.
  const [profiles, setProfiles] = useState<DocumentData[]>(serverProfiles);
  const [friends, setFriends] = useState<string[]>([]);
  const [isAddingFriend, setIsAddingFriend] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  // 2. On client-side mount, check for saved search results and overwrite server data if found.
  useEffect(() => {
    const savedResultsRaw = localStorage.getItem('searchResults');
    if (savedResultsRaw) {
      try {
        const savedResults = JSON.parse(savedResultsRaw);
        if (Array.isArray(savedResults) && savedResults.length > 0) {
          console.log("Client Hydration: Found and applying saved search results.");
          setProfiles(savedResults);
        }
      } catch (e) {
        console.error("Failed to parse saved search results:", e);
      }
    }
  }, []); // <-- Empty dependency array ensures this runs ONLY ONCE on the client.

  // 3. This effect now runs whenever the profiles state is updated (from server OR localStorage)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    if (currentUserProfile && currentUserProfile.friends) {
      setFriends(currentUserProfile.friends);
    }

    // Only proceed if there are profiles to process
    if (profiles.length > 0) {
        // Check if online status is already present to avoid re-fetching
        if (profiles[0].isOnline !== undefined) return;

        const uids = profiles.map(p => p.uid || p.objectID).filter(Boolean);
        getUsersOnlineStatus(uids).then(onlineStatuses => {
            setProfiles(currentProfiles => 
              currentProfiles.map(p => ({
                ...p,
                isOnline: onlineStatuses[p.uid || p.objectID] || false,
              }))
            );
        });
    }

    return () => unsubscribe();
  }, [profiles, currentUserProfile]);

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

  if (loading && profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-96">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <h2 className="mt-6 text-2xl font-semibold">Chargement des profils...</h2>
      </div>
    );
  }

  if (profiles.length === 0 && !loading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center text-center px-4">
        <UserX className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-bold">Aucun résultat</h2>
        <p className="mt-2 text-muted-foreground">Lancez une recherche pour découvrir de nouveaux profils !</p>
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
