'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { AdMob, BannerAdPluginEvents, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

interface AdMobContextType {
  bannerHeight: number;
}

const AdMobContext = createContext<AdMobContextType>({ bannerHeight: 0 });

export const useAdMob = () => useContext(AdMobContext);

export const AdMobProvider = ({ children }: { children: React.ReactNode }) => {
  const [bannerHeight, setBannerHeight] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initializeAdMob = async () => {
      try {
        await AdMob.initialize({
          requestTrackingAuthorization: false,
          initializeForTesting: true,
        });
      } catch (error) {
        console.error("Erreur lors de l'initialisation d'AdMob", error);
      }
    };

    initializeAdMob();

    const sizeListener = AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: { height: number; width: number; }) => {
      setBannerHeight(info.height);
    });

    return () => {
      sizeListener.remove();
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    
    const isDiscoverPage = pathname === '/';

    const showBanner = async () => {
      try {
        await AdMob.showBanner({
          adId: 'ca-app-pub-3940256099942544/6300978111',
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
        });
      } catch (error) {
        console.error("Erreur lors de l'affichage de la bannière", error);
      }
    };

    const hideBanner = async () => {
      try {
        await AdMob.hideBanner();
        setBannerHeight(0);
      } catch (error) {
        console.error("Erreur lors du masquage de la bannière", error);
      }
    };
    
    if (isDiscoverPage) {
      showBanner();
    } else {
      hideBanner();
    }
  }, [pathname]);

  return (
    <AdMobContext.Provider value={{ bannerHeight }}>
      {children}
    </AdMobContext.Provider>
  );
};
