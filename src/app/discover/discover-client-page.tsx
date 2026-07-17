
"use client";

import { useState, useEffect } from 'react';
import ProfileCard from '@/components/profile-card';
import { Loader2, UserX } from 'lucide-react';
import { DocumentData, collection, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '@/lib/schema';
import { addFriend, getUsersOnlineStatus } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface DiscoverClientPageProps {
  initialProfiles: DocumentData[]; // Default profiles from the server
  loading: boolean;
  currentUserProfile: DocumentData | null; // This is the initially loaded profile
}

export default function DiscoverClientPage({ initialProfiles, loading: initialLoading, currentUserProfile: initialUserProfile }: DiscoverClientPageProps) {
  const [profiles, setProfiles] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<string[]>([]);
  const [isAddingFriend, setIsAddingFriend] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [liveCurrentUserProfile, setLiveCurrentUserProfile] = useState<DocumentData | null>(initialUserProfile);
  const [usersWhoBlockedMe, setUsersWhoBlockedMe] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Effect to get the current authenticated user
  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => authUnsubscribe();
  }, []);

  // Effect to subscribe to the current user's profile for real-time updates
  useEffect(() => {
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setLiveCurrentUserProfile(data);
          setFriends(data.friends || []);
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Effect to find out who has blocked the current user
  useEffect(() => {
    if (currentUser) {
      const q = query(collection(db, 'users'), where('blockedUsers', 'array-contains', currentUser.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ids = new Set(snapshot.docs.map(doc => doc.id));
        setUsersWhoBlockedMe(ids);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // This effect handles the initial load and updates from localStorage, it remains mostly unchanged.
  useEffect(() => {
    let profilesToSet = initialProfiles;
    let loadedFromStorage = false;

    const savedResultsRaw = localStorage.getItem('searchResults');
    if (savedResultsRaw) {
      try {
        profilesToSet = JSON.parse(savedResultsRaw);
        loadedFromStorage = true;
      } catch (e) {
        console.error("Failed to parse saved search results, falling back to initial profiles:", e);
      }
    }

    setProfiles(profilesToSet);

    if (loadedFromStorage || !initialLoading) {
      setIsLoading(false);
    }
  }, [initialProfiles, initialLoading]);

  // This effect enriches profiles with online status, it remains mostly unchanged.
  useEffect(() => {
    if (profiles.length > 0) {
      const uids = profiles.map(p => p.uid || p.objectID).filter(Boolean);
      getUsersOnlineStatus(uids).then(onlineStatuses => {
        setProfiles(currentProfiles => 
          currentProfiles.map(p => ({ ...p, isOnline: onlineStatuses[p.uid || p.objectID] || false }))
        );
      });
    }
  }, [profiles.length]); // Simplified dependency

  const handleAddFriend = async (friendId: string) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Vous devez être connecté pour ajouter des amis.' });
      return;
    }
    setIsAddingFriend(friendId);
    try {
      const result = await addFriend(currentUser.uid, friendId);
      if (result.success) {
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

  // Symmetrical filtering logic applied just before rendering
  const iHaveBlockedIds = new Set(liveCurrentUserProfile?.blockedUsers || []);
  const allBlockedIds = new Set([...iHaveBlockedIds, ...usersWhoBlockedMe]);

  const mappedProfiles: UserProfile[] = profiles
    .filter(p => !allBlockedIds.has(p.uid || p.objectID)) // Filter out blocked profiles
    .map(p => ({
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-96">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <h2 className="mt-6 text-2xl font-semibold">Chargement des profils...</h2>
      </div>
    );
  }

  if (mappedProfiles.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center text-center px-4">
        <UserX className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-bold">Aucun résultat</h2>
        <p className="mt-2 text-muted-foreground">Essayez d'élargir vos critères de recherche ou ajustez vos filtres.</p>
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
