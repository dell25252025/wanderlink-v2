
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { initPushNotifications } from '@/lib/fcm'; // Importer notre service
import { useUserPresence } from '@/hooks/useUserPresence'; // Ajout de l'import

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Appel du hook de présence avec l'utilisateur actuel
  useUserPresence(currentUser);

  useEffect(() => {
    let cleanupPushNotifications: (() => Promise<void>) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cleanupPushNotifications) {
        console.log("Cleaning up previous user's push notifications...");
        await cleanupPushNotifications();
        cleanupPushNotifications = null;
      }

      setCurrentUser(user);
      setLoading(false);

      if (user) {
        console.log("New user logged in, initializing push notifications...");
        cleanupPushNotifications = await initPushNotifications(user.uid);
      } else {
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
  }, []);

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
