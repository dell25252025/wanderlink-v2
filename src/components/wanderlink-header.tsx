'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationBell } from '@/components/ui/notification-bell';

const WanderLinkHeader = () => {
  const pathname = usePathname();
  const router = useRouter();

  // Ne pas afficher le header sur certaines pages
  const noHeaderPaths = ['/login', '/create-profile', '/call'];
  if (noHeaderPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  const handleBackNavigation = () => {
    // S'il y a un historique, on revient en arrière.
    if (window.history.length > 1) {
      router.back();
    } else {
      // Sinon, on retourne à l'accueil comme solution de secours.
      router.push('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
      {pathname === '/discover' ? (
        <button 
          onClick={handleBackNavigation} 
          className="text-2xl font-bold font-logo text-left bg-transparent border-none p-0 cursor-pointer"
        >
          <span className="text-foreground">Wander</span><span className="text-accent">Link</span>
        </button>
      ) : (
        <Link href="/" className="text-2xl font-bold font-logo">
          <span className="text-foreground">Wander</span><span className="text-accent">Link</span>
        </Link>
      )}

      <div className="flex items-center space-x-4">
        <NotificationBell />
      </div>
    </header>
  );
};

export default WanderLinkHeader;
