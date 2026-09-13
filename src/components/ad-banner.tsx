'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  type BannerAdOptions,
  type AdInfo,
  type PluginListenerHandle,
} from '@capacitor-community/admob';
import { useAdMob } from '@/context/admob-context';

const AdBanner = () => {
  const { setBannerHeight } = useAdMob();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    let bannerShown = false;
    let sizeListener: PluginListenerHandle | null = null;

    const showAndManageBanner = async () => {
      try {
        sizeListener = await AdMob.addListener('bannerAdSizeChanged', (info: AdInfo) => {
          setBannerHeight(info.height);
        });

        if (cancelled) {
          await sizeListener.remove();
          return;
        }

        const options: BannerAdOptions = {
          adId: 'ca-app-pub-3940256099942544/6300978111',
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
        };
        
        await AdMob.showBanner(options);

        if (cancelled) {
          await AdMob.removeBanner();
        } else {
          bannerShown = true;
        }

      } catch (error) {
        console.error("Erreur durant le cycle de vie de la bannière AdMob", error);
        if (!cancelled) {
          setBannerHeight(0);
        }
      }
    };

    showAndManageBanner();

    return () => {
      cancelled = true;
      const cleanup = async () => {
        if (sizeListener) {
          try {
            await sizeListener.remove();
          } catch (e) {
            console.warn('Le listener AdMob n\'a pas pu être supprimé.', e);
          }
        }
        if (bannerShown) {
          try {
            await AdMob.removeBanner();
          } catch (e) {
            console.warn('La bannière AdMob n\'a pas pu être supprimée.', e);
          }
        }
        setBannerHeight(0);
      };

      cleanup();
    };
  }, [setBannerHeight]);

  return null;
};

export default AdBanner;
