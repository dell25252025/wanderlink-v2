'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';

const WanderLinkHeader = () => {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifsRef, where('read', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching notification count:", error);
      setUnreadCount(0);
    });

    return () => unsubscribe();
  }, [user]);

  const noHeaderPaths = ['/login', '/create-profile', '/call'];
  if (noHeaderPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
      <Link href="/" className="text-2xl font-bold font-logo">
        <span className="text-foreground">Wander</span><span className="text-accent">Link</span>
      </Link>

      <div className="flex items-center space-x-4">
        <Link href="/notifications" className={cn('relative text-muted-foreground transition-colors hover:text-foreground', { 'text-primary': pathname === '/notifications' } )}>
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};

export default WanderLinkHeader;
