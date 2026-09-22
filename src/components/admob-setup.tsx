'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, AdOptions, InterstitialAdPluginEvents, PluginListenerHandle } from '@capacitor-community/admob';
import { useAd } from '@/context/ad-context';

const AD_ID_INTERSTITIAL_PROD = 'ca-app-pub-9129126817397448/2514345599';

const AdMobSetup = () => {
  const admobInitialized = useRef(false);
  const isPreparing = useRef(false);
  const { 
    setInterstitialReady, 
    setIsAdShowing, 
    updateLastAdShownAt, 
    registerAdMobFunctions
  } = useAd();

  const prepareInterstitialAd = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || isPreparing.current) {
      return;
    }
    isPreparing.current = true;
    console.log('AdMob: Preparing new interstitial ad...');
    try {
      const options: AdOptions = { adId: AD_ID_INTERSTITIAL_PROD, isTesting: false };
      await AdMob.prepareInterstitial(options);
    } catch (error) {
      console.error('AdMob: Failed to prepare interstitial.', error);
    } finally {
      isPreparing.current = false;
    }
  }, []);

  const showInterstitialAd = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('AdMob: Calling showInterstitial.');
        await AdMob.showInterstitial();
      } catch (error) {
        console.error('AdMob: Failed to show interstitial.', error);
      }
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
        registerAdMobFunctions({ 
            showInterstitial: showInterstitialAd, 
            prepareInterstitial: prepareInterstitialAd 
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const listeners: PluginListenerHandle[] = [];

    const initializeAdMob = async () => {
      if (Capacitor.isNativePlatform() && !admobInitialized.current) {
        admobInitialized.current = true;
        console.log('AdMob: Initializing for native platform.');
        
        try {
          await AdMob.initialize({ initializeForTesting: false });
          console.log('AdMob: Initialization successful.');

          listeners.push(AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
            console.log('AdMob Event: Loaded. Ad is ready.');
            setInterstitialReady(true);
          }));

          listeners.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
            console.error('AdMob Event: FailedToLoad.', error);
            setInterstitialReady(false);
          }));

          listeners.push(AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
            console.log('AdMob Event: Showed. Cooldown started. Search count is NOT reset.');
            setIsAdShowing(true);
            setInterstitialReady(false);
            updateLastAdShownAt();
          }));

          listeners.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
            console.error('AdMob Event: FailedToShow.', error);
            setIsAdShowing(false);
          }));

          listeners.push(AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
            console.log('AdMob Event: Dismissed. Preparing next ad.');
            setIsAdShowing(false);
            prepareInterstitialAd();
          }));
          
          prepareInterstitialAd();

        } catch (error) {
          console.error('AdMob: Initialization or listener setup failed', error);
        }
      }
    };

    initializeAdMob();

    return () => {
      console.log('AdMob: Cleaning up listeners.');
      listeners.forEach(listener => listener.remove());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default AdMobSetup;
