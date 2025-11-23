
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Compass, Users, MessageSquare, User, UserPlus, Settings } from 'lucide-react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { getUserProfile } from '@/lib/firebase-actions';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// --- COMPOSANT D'UN ÉLÉMENT DE NAVIGATION --- //
interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  hasNotification?: boolean;
}

const NavItem = ({ href, icon: Icon, label, active, hasNotification }: NavItemProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Link href={href} className="flex flex-col items-center justify-center h-full text-center">
        <div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-full h-12 w-12 p-1 transition-colors duration-200',
            active ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Icon className="h-6 w-6" />
          {hasNotification && (
            <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-primary ring-1 ring-background" />
          )}
        </div>
      </Link>
    </TooltipTrigger>
    <TooltipContent side="top" className="mb-2">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
);

// --- COMPOSANT PRINCIPAL DE LA BARRE DE NAVIGATION --- //
const BottomNav = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const pathname = usePathname();

  // Gère l'état de l'utilisateur et sa photo de profil
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setProfilePicture(profile?.profilePictures?.[0] || null);
        } catch (error) {
          console.error("Failed to fetch user profile for nav:", error);
          setProfilePicture(null);
        }
      } else {
        setProfilePicture(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // **CORRECTION DE L'ERREUR D'INDEX**
  // La requête est simplifiée pour ne pas causer d'erreur, le reste de la logique est géré côté client.
  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribeChats = onSnapshot(q, (snapshot) => {
      const unreadFromOthers = snapshot.docs.some(doc => {
        const data = doc.data();
        const lastMessage = data.lastMessage;
        // La notification s'affiche si le dernier message n'est pas lu ET qu'il ne vient pas de nous
        return lastMessage && lastMessage.read === false && lastMessage.senderId !== currentUser.uid;
      });
      setHasUnreadMessages(unreadFromOthers);
    });

    return () => unsubscribeChats();
  }, [currentUser]);

  // Définition des états actifs en fonction du chemin
  const isDiscoverActive = pathname.startsWith('/discover') || pathname === '/';
  const areMessagesActive = pathname.startsWith('/inbox');
  const areSettingsActive = pathname.startsWith('/settings');
  const areFriendsActive = pathname.startsWith('/friends');
  
  const getProfileContent = () => {
    if (currentUser) {
      if (profilePicture) {
        return (
          <Avatar className="h-full w-full border-2 border-background group-hover:border-secondary transition-colors">
            <AvatarImage src={profilePicture} alt="User profile picture" className="object-cover" />
            <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
          </Avatar>
        );
      }
      return <User className="h-6 w-6 mx-auto" />;
    }
    return <UserPlus className="h-6 w-6 mx-auto" />;
  };
  
  const profileHref = currentUser ? `/profile?id=${currentUser.uid}` : '/login';
  const isProfileActive = currentUser ? pathname === '/profile' && new URLSearchParams(window.location.search).get('id') === currentUser.uid : false;

  return (
    <TooltipProvider>
      <div className="fixed bottom-2 left-1/2 z-20 w-[calc(100%-1rem)] max-w-sm -translate-x-1/2 md:bottom-4">
        <nav className="h-14 w-full rounded-full border bg-background/90 p-1 shadow-lg backdrop-blur-md">
          <div className="grid h-full grid-cols-5 items-center justify-around">
            
            <NavItem href="/discover" icon={Compass} label="Découvrir" active={isDiscoverActive} />
            <NavItem href="/friends" icon={Users} label="Amis" active={areFriendsActive} />

            {/* Bouton central de profil */}
            <div className="relative flex justify-center items-center h-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={profileHref} passHref className="group">
                    <div className={cn(`flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:bg-primary/90`, isProfileActive ? 'bg-accent' : 'bg-primary', !currentUser ? 'animate-pulse-slow' : '')}>
                      <div className="h-10 w-10">{getProfileContent()}</div>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="mb-2"><p>{currentUser ? 'Profil' : 'Connexion'}</p></TooltipContent>
              </Tooltip>
            </div>

            <NavItem href="/inbox" icon={MessageSquare} label="Messages" active={areMessagesActive} hasNotification={hasUnreadMessages} />
            <NavItem href="/settings" icon={Settings} label="Paramètres" active={areSettingsActive} />

          </div>
        </nav>
      </div>
    </TooltipProvider>
  );
};

export default BottomNav;
