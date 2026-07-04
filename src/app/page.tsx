'use client';

import { Suspense, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getAllUsers, getUserProfile } from '@/lib/firebase-actions';
import BottomNav from '@/components/bottom-nav';
import WanderlinkHeader from '@/components/wanderlink-header';
import { useToast } from '@/hooks/use-toast';
import type { DocumentData } from 'firebase/firestore';
import DiscoverClientPage from '@/app/discover/discover-client-page';

function AuthenticatedHomePage({ user }: { user: User }) {
  const { toast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState<DocumentData | null>(null);
  const [initialProfiles, setInitialProfiles] = useState<DocumentData[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);

  // SOLUTION: Ce hook ne doit s'exécuter qu'UNE SEULE FOIS au montage.
  // Les dépendances ont été retirées pour empêcher les ré-exécutions.
  useEffect(() => {
    getUserProfile(user.uid).then(setCurrentUserProfile);
    
    getAllUsers(12)
      .then(users => {
        const otherUsers = users.filter(u => u.id !== user.uid);
        setInitialProfiles(otherUsers);
      })
      .catch(error => {
        console.error("Failed to fetch initial users:", error);
        toast({ variant: 'destructive', title: 'Error fetching users' });
      })
      .finally(() => setProfilesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <WanderlinkHeader />
      <main className="flex-1 pb-24 pt-10 md:pt-12">
        <div className="container mx-auto max-w-7xl px-2">
          <DiscoverClientPage 
            initialProfiles={initialProfiles} 
            loading={profilesLoading} 
            currentUserProfile={currentUserProfile}
          />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function ConditionalHome() {
  const [currentUserAuth, setCurrentUserAuth] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserAuth(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loadingAuth && !currentUserAuth) {
      router.push('/login');
    }
  }, [loadingAuth, currentUserAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUserAuth) {
    return (
      <Suspense fallback={<div className="flex h-screen w-full flex-col items-center justify-center bg-background"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
        <AuthenticatedHomePage user={currentUserAuth} />
      </Suspense>
    );
  }
  
  return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
  );
}

export default ConditionalHome;
