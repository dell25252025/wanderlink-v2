'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ProfileCard from '@/components/profile-card';
import { Loader2, UserX } from 'lucide-react';
import { DocumentData, collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { UserProfile } from '@/lib/schema';
import { addFriend, getUsersOnlineStatus } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { SEARCH_RESULTS_STORAGE_KEY } from './page';
import type algoliasearch from 'algoliasearch/lite';
import { Button } from '@/components/ui/button';

interface DiscoverClientPageProps {
  initialProfiles: DocumentData[];
  loading: boolean;
  currentUserProfile: DocumentData | null;
}

declare global {
    interface Window { 
        algoliasearch: typeof algoliasearch;
        __ALGOLIA_APP_ID__: string;
        __ALGOLIA_SEARCH_KEY__: string;
    }
}

let usersIndexSingleton: ReturnType<ReturnType<typeof algoliasearch>['initIndex']> | null = null;

async function getUsersIndex(): Promise<ReturnType<ReturnType<typeof algoliasearch>['initIndex']> | null> {
  if (usersIndexSingleton) return usersIndexSingleton;
  if (typeof window !== 'undefined' && !window.algoliasearch) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (window.algoliasearch) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
  if (typeof window === 'undefined' || !window.algoliasearch) {
      console.error("Algolia script could not be loaded or not in a browser environment.");
      return null;
  }
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || window.__ALGOLIA_APP_ID__;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || window.__ALGOLIA_SEARCH_KEY__;
  if (!appId || !searchKey) {
    console.error("Algolia keys are missing.");
    return null;
  }
  const client = window.algoliasearch(appId, searchKey);
  usersIndexSingleton = client.initIndex("users");
  return usersIndexSingleton;
}


export default function DiscoverClientPage({ initialProfiles, loading: initialLoading, currentUserProfile: initialUserProfile }: DiscoverClientPageProps) {
  const [profiles, setProfiles] = useState<DocumentData[]>([]);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<string[]>([]);
  const [isAddingFriend, setIsAddingFriend] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [liveCurrentUserProfile, setLiveCurrentUserProfile] = useState<DocumentData | null>(initialUserProfile);
  const [usersWhoBlockedMe, setUsersWhoBlockedMe] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchOptions, setSearchOptions] = useState<any | null>(null);

  const operationUidRef = useRef<string | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      operationUidRef.current = user ? user.uid : null;
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => authUnsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (isMounted && operationUidRef.current === currentUser.uid) {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setLiveCurrentUserProfile(data);
                setFriends(data.friends || []);
            } else {
                setLiveCurrentUserProfile(null);
                setFriends([]);
            }
        }
      });
      return () => { isMounted = false; unsubscribe(); };
    } else {
      setLiveCurrentUserProfile(null);
      setFriends([]);
    }
    return () => { isMounted = false; };
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    if (currentUser) {
      const q = query(collection(db, 'users'), where('blockedUsers', 'array-contains', currentUser.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          if (isMounted && operationUidRef.current === currentUser.uid) {
            const ids = new Set(snapshot.docs.map(doc => doc.id));
            setUsersWhoBlockedMe(ids);
          }
      });
      return () => { isMounted = false; unsubscribe() };
    } else {
      setUsersWhoBlockedMe(new Set());
    }
    return () => { isMounted = false; };
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;

    if (!authReady) {
      setIsLoading(true);
      return;
    }

    // Always reset state on user change
    setProfiles(initialProfiles);
    setCurrentPage(0);
    setTotalPages(0);
    setSearchOptions(null);
    setIsMoreLoading(false);
    setIsLoading(initialLoading);

    if (!currentUser) {
      return;
    }
    
    const userSearchResultsKey = `${SEARCH_RESULTS_STORAGE_KEY}_${currentUser.uid}`;
    const savedResultsRaw = localStorage.getItem(userSearchResultsKey);
    
    if (savedResultsRaw) {
        try {
            const savedData = JSON.parse(savedResultsRaw);
            if (isMounted && operationUidRef.current === currentUser.uid) {
                if (savedData.hits) {
                    setProfiles(savedData.hits);
                    setCurrentPage(savedData.page || 0);
                    setTotalPages(savedData.nbPages || 0);
                    setSearchOptions(savedData.searchOptions || null);
                } else {
                    setProfiles(savedData);
                }
            }
        } catch (e) {
            console.error("Failed to parse search results, falling back to initial.", e);
        }
    }
    
    return () => { isMounted = false; };
  }, [authReady, currentUser, initialProfiles, initialLoading]);


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
    if (!currentUser) {
      toast({ variant: "destructive", title: "Vous devez être connecté" });
      return;
    }
    setIsAddingFriend(friendId);
    try {
      await addFriend(currentUser.uid, friendId);
      toast({ title: "Invitation envoyée !" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setIsAddingFriend(null);
    }
  };
  
  const loadMoreResults = useCallback(async () => {
    if (!searchOptions || isMoreLoading || currentPage >= totalPages - 1 || !currentUser) {
        return;
    }

    const requestUid = currentUser.uid;
    setIsMoreLoading(true);

    try {
        const index = await getUsersIndex();
        if (!index) return;

        const nextPage = currentPage + 1;
        const response = await index.search('', { ...searchOptions, page: nextPage });

        if (operationUidRef.current === requestUid) {
            setProfiles(prev => [...prev, ...response.hits]);
            setCurrentPage(nextPage);
        }
    } catch (error) {
        console.error("Failed to load more results:", error);
        toast({ variant: "destructive", title: "Impossible de charger plus de résultats" });
    } finally {
        if (operationUidRef.current === requestUid) {
            setIsMoreLoading(false);
        }
    }
  }, [searchOptions, isMoreLoading, currentPage, totalPages, toast, currentUser]);

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
    <div>
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
        {currentPage < totalPages - 1 && (
            <div className="flex justify-center mt-8">
                <Button onClick={loadMoreResults} disabled={isMoreLoading}>
                    {isMoreLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Charger plus
                </Button>
            </div>
        )}
    </div>
  );
}
