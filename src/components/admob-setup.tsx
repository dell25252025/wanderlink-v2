'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, AdOptions, InterstitialAdPluginEvents, PluginListenerHandle } from '@capacitor-community/admob';

const AdMobSetup = () => {
  const admobInitialized = useRef(false);

  useEffect(() => {
    let loadedListener: PluginListenerHandle | null = null;
    let failedListener: PluginListenerHandle | null = null;

    const initializeAdMob = async () => {
      // Guard: Only run on native platforms and only run once.
      if (Capacitor.isNativePlatform() && !admobInitialized.current) {
        admobInitialized.current = true; // Mark as initialized
        console.log('AdMob: Initializing for native platform.');

        try {
          await AdMob.initialize({
            requestTrackingAuthorization: true,
            testingDevices: [],
            initializeForTesting: true,
          });
          console.log('AdMob: Initialization successful.');

          const options: AdOptions = {
            adId: 'ca-app-pub-3940256099942544/1033173712', // Official Test Ad ID
            isTesting: true,
          };
          await AdMob.prepareInterstitial(options);
          console.log('AdMob: Interstitial ad prepared.');

          // Add listeners only on native platform after successful initialization
          loadedListener = AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
            console.log('AdMob: Interstitial ad loaded event.');
          });

          failedListener = AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
            console.error('AdMob: Interstitial ad failed to load event.', error);
          });

        } catch (error) {
          console.error('AdMob: Initialization or listener setup failed', error);
        }
      }
    };

    initializeAdMob();

    // Return a cleanup function that will be called on component unmount
    return () => {
      if (loadedListener) {
        loadedListener.remove();
      }
      if (failedListener) {
        failedListener.remove();
      }
    };
  }, []);

  return null; // This component does not render anything
};

export default AdMobSetup;
