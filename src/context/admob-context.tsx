'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AdMobContextType {
  bannerHeight: number;
  setBannerHeight: (height: number) => void;
}

const AdMobContext = createContext<AdMobContextType | undefined>(undefined);

export const AdMobProvider = ({ children }: { children: ReactNode }) => {
  const [bannerHeight, setBannerHeight] = useState(0);

  const value = useMemo(
    () => ({
      bannerHeight,
      setBannerHeight,
    }),
    [bannerHeight]
  );

  return (
    <AdMobContext.Provider value={value}>
      {children}
    </AdMobContext.Provider>
  );
};

export const useAdMob = () => {
  const context = useContext(AdMobContext);

  if (context === undefined) {
    throw new Error('useAdMob must be used within an AdMobProvider');
  }

  return context;
};