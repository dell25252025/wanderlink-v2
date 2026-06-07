
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { initPushNotifications } from '@/lib/fcm'; // Importer notre service

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Variable pour stocker la fonction de nettoyage des notifications
    let cleanupPushNotifications: (() => Promise<void>) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Si un nettoyage précédent existe, exécutez-le d'abord
      if (cleanupPushNotifications) {
        console.log("Cleaning up previous user's push notifications...");
        await cleanupPushNotifications();
        cleanupPushNotifications = null;
      }

      setCurrentUser(user);
      setLoading(false);

      // Si un nouvel utilisateur est connecté, on initialise les notifications
      if (user) {
        console.log("New user logged in, initializing push notifications...");
        // 2. Stocker la nouvelle fonction de nettoyage
        cleanupPushNotifications = await initPushNotifications(user.uid);
      } else {
        console.log("User is logged out.");
      }
    });

    return () => {
      // Nettoyage final lors du démontage du composant
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
