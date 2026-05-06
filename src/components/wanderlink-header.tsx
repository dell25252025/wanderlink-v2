'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/ui/notification-bell';

const WanderLinkHeader = () => {
  const pathname = usePathname();

  // Ne pas afficher le header sur certaines pages
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
        <NotificationBell />
      </div>
    </header>
  );
};

export default WanderLinkHeader;
