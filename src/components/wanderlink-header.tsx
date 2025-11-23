
'use client';

import Link from 'next/link';
import { Bell, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';

const WanderLinkHeader = () => {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef,
      where('userId', '==', user.uid),
      where('read', '==', false),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnread(!snapshot.empty);
    }, (error) => {
      console.error("Error fetching notification status:", error);
      setHasUnread(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Ne pas afficher le header sur certaines pages
  const noHeaderPaths = ['/login', '/create-profile', '/call'];
  if (noHeaderPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
      <Link href="/" className="text-2xl font-bold text-primary">
        WanderLink
      </Link>

      <div className="flex items-center space-x-4">
        <Link href="/discover?search=true" className={cn('text-muted-foreground transition-colors hover:text-foreground', { 'text-primary': pathname === '/discover' } )}>
          <Search className="h-6 w-6" />
        </Link>
        <Link href="/notifications" className={cn('relative text-muted-foreground transition-colors hover:text-foreground', { 'text-primary': pathname === '/notifications' } )}>
          <Bell className="h-6 w-6" />
          {hasUnread && (
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Link>
      </div>
    </header>
  );
};

export default WanderLinkHeader;
