'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import ProfileCard from '@/components/profile-card';
import { Loader2, UserX } from 'lucide-react';
import { DocumentData, collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { UserProfile } from '@/lib/schema';
import { addFriend, getUsersOnlineStatus } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import AdMob from '@/lib/capacitor-plugins/admob';

interface DiscoverClientPageProps {
  initialProfiles: DocumentData[];
  loading: boolean;
  currentUserProfile: DocumentData | null;
}

export default function DiscoverClientPage({ initialProfiles, loading: initialLoading, currentUserProfile: initialUserProfile }: DiscoverClientPageProps) {
  const [profiles, setProfiles] = useState<DocumentData[]>([]);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<string[]>([]);
  const [isAddingFriend, setIsAddingFriend] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [liveCurrentUserProfile, setLiveCurrentUserProfile] = useState<DocumentData | null>(initialUserProfile);
  const [usersWhoBlockedMe, setUsersWhoBlockedMe] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const pathname = usePathname();

  // --- EFFET POUR GÉRER LA BANNIÈRE ADMOB (AVEC CORRECTION) ---
  useEffect(() => {
    // On utilise un timeout pour s'assurer que le pathname a eu le temps de se mettre à jour après la navigation.
    const timer = setTimeout(() => {
      const isDiscoverPage = pathname.startsWith('/discover');
      
      if (isDiscoverPage) {
        AdMob.showBanner();
      } else {
        AdMob.hideBanner();
      }
    }, 100); // Un délai de 100ms est généralement suffisant.

    // La fonction de nettoyage s'assure que la bannière est cachée si on quitte la page.
    return () => {
      clearTimeout(timer);
      AdMob.hideBanner();
    };
  }, [pathname]);


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

  // This effect handles the initial load and updates from localStorage.
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

  const profileIds = useMemo(() => 
    profiles.map(p => p.uid || p.objectID).filter(Boolean).join(',')
  , [profiles]);

  useEffect(() => {
    const uids = profileIds.split(',').filter(Boolean);

    if (uids.length === 0) {
      setOnlineStatuses({});
      return;
    }

    let isCancelled = false;

    getUsersOnlineStatus(uids).then(statuses => {
      if (!isCancelled) {
        setOnlineStatuses(statuses);
      }
    }).catch(error => {
        console.error("Erreur lors de la récupération des statuts de présence sur Discover:", error);
    });

    return () => {
        isCancelled = true;
    }

  }, [profileIds]);

  const handleAddFriend = async (friendId: string) => {
  };

  const iHaveBlockedIds = new Set(liveCurrentUserProfile?.blockedUsers || []);
  const allBlockedIds = new Set([...iHaveBlockedIds, ...usersWhoBlockedMe]);

  const mappedProfiles: UserProfile[] = profiles
    .filter(p => !allBlockedIds.has(p.uid || p.objectID))
    .map(p => {
      const uid = p.uid || p.objectID;
      return {
        id: uid,
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
        isOnline: onlineStatuses[uid] ?? false,
        image: p.profilePictures?.[0] || `https://picsum.photos/seed/${uid}/800/1200`
      };
  });

  if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  if (mappedProfiles.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg font-semibold">Aucun profil trouvé</p>
        <p className="text-muted-foreground">Ajustez vos critères de recherche pour voir plus de voyageurs.</p>
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
