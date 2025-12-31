
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// List of public paths that don't require authentication or profile completion
const publicPaths = ['/login', '/create-profile', '/google-onboarding', '/settings/privacy-policy'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // User is signed in, check if their profile is complete.
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.profileComplete) {
            // Profile is not complete, redirect to the appropriate onboarding page.
            const providerId = user.providerData?.[0]?.providerId;
            if (providerId === 'google.com' && pathname !== '/google-onboarding') {
              router.push('/google-onboarding');
            } else if (providerId !== 'google.com' && pathname !== '/create-profile') {
              router.push('/create-profile');
            }
          }
        } else {
          // This is a new user, they will be redirected from AuthForm
          // but we add a safeguard here.
          const providerId = user.providerData?.[0]?.providerId;
          if (providerId === 'google.com' && pathname !== '/google-onboarding') {
            router.push('/google-onboarding');
          } else if (pathname !== '/create-profile') {
            router.push('/create-profile');
          }
        }
      } else {
        // User is not signed in, redirect to login if not on a public page.
        if (!publicPaths.includes(pathname)) {
          router.push('/login');
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

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
