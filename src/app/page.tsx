
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { Loader2 } from 'lucide-react';
import { getAllUsers, getUserProfile } from '@/lib/firebase-actions.ts';
import BottomNav from '@/components/bottom-nav';
import WanderlinkHeader from '@/components/wanderlink-header';
import DiscoverClientPage from '@/app/discover/discover-client-page';
import { User } from 'firebase/auth';

// 1. Force dynamic rendering
export const dynamic = 'force-dynamic';

async function AuthenticatedHomePage() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('user');
  
  if (!userCookie) {
    // This should ideally be handled by middleware, but as a fallback:
    return null;
  }

  const user: User = JSON.parse(userCookie.value);
  
  // 2. Fetch initial data without any localStorage logic
  const [currentUserProfile, initialProfiles] = await Promise.all([
    getUserProfile(user.uid),
    getAllUsers(12).then(users => users.filter(u => u.id !== user.uid))
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <WanderlinkHeader />
      <main className="flex-1 pb-24 pt-10 md:pt-12">
        <div className="container mx-auto max-w-7xl px-2">
          <DiscoverClientPage 
            initialProfiles={initialProfiles} 
            loading={false} // Data is pre-fetched on the server
            currentUserProfile={currentUserProfile}
          />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

// Main export remains a wrapper for auth logic (if any) or direct component export
export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full flex-col items-center justify-center bg-background"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <AuthenticatedHomePage />
    </Suspense>
  );
}
