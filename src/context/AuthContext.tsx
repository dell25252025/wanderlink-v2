'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation'; // Importer useRouter et usePathname
import { initPushNotifications } from '@/lib/fcm';
import { useUserPresence } from '@/hooks/useUserPresence';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Définir la date de déploiement de la fonctionnalité de vérification
// IMPORTANT : Mettre à jour cette date juste avant le déploiement
const VERIFICATION_DEPLOYMENT_DATE = new Date('2024-08-01T00:00:00Z');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useUserPresence(currentUser);

  useEffect(() => {
    let cleanupPushNotifications: (() => Promise<void>) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // Nettoyer les notifications précédentes et initialiser les nouvelles
        if (cleanupPushNotifications) await cleanupPushNotifications();
        cleanupPushNotifications = await initPushNotifications(user.uid);

        // --- LOGIQUE DU GARDE-FOU ---
        const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
        const creationTime = new Date(user.metadata.creationTime || Date.now());
        const isNewUserSubjectToVerification = creationTime >= VERIFICATION_DEPLOYMENT_DATE;

        // Routes publiques ou faisant partie du processus de vérification/création
        const allowedPaths = ['/login', '/auth/verify-email', '/auth/action', '/create-profile'];

        // Appliquer la redirection SEULEMENT si toutes les conditions sont remplies
        if (
          !user.emailVerified && 
          !isGoogleUser && 
          isNewUserSubjectToVerification &&
          !allowedPaths.includes(pathname)
        ) {
          console.log('Redirecting user to email verification page.');
          router.push('/auth/verify-email');
          return;
        }
        // --- FIN DE LA LOGIQUE DU GARDE-FOU ---

      } else {
        if (cleanupPushNotifications) {
            await cleanupPushNotifications();
            cleanupPushNotifications = null;
        }
        console.log("User is logged out.");
      }
    });

    return () => {
      console.log("Auth provider unmounting, ensuring cleanup.");
      unsubscribe();
      if (cleanupPushNotifications) {
        cleanupPushNotifications();
      }
    };
  }, [pathname, router]); // Ajouter pathname et router aux dépendances

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
