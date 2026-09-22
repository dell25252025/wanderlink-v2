'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useRef, useEffect } from 'react';

// --- Ad Timing Configuration ---
const PROD_TIMINGS = {
    USAGE_TIMER_MS: 10 * 60 * 1000, // 10 minutes
    COOLDOWN_MS: 10 * 60 * 1000,      // 10 minutes
};

const TEST_TIMINGS = {
    USAGE_TIMER_MS: 30 * 1000, // 30 seconds
    COOLDOWN_MS: 60 * 1000,      // 60 seconds
};

const SEARCH_THRESHOLD = 3;

// --- Type Definitions ---
interface AdMobFunctions {
  showInterstitial: () => Promise<void>;
  prepareInterstitial: () => Promise<void>;
}

interface AdContextType {
  searchCount: number;
  isInterstitialReady: boolean;
  isAdShowing: boolean;
  isCooldownActive: () => boolean;
  incrementSearchCount: () => void;
  resetSearchCount: () => void;
  setInterstitialReady: (isReady: boolean) => void;
  setIsAdShowing: (isShowing: boolean) => void;
  updateLastAdShownAt: () => void;
  registerAdMobFunctions: (functions: AdMobFunctions) => void;
  triggerAdShowOnSearch: (currentSearchCount: number) => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

// --- Provider Component ---
export const AdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [searchCount, setSearchCount] = useState(0);
    const [isInterstitialReady, setInterstitialReady] = useState(false);
    const [isAdShowing, setIsAdShowing] = useState(false);
    const [lastAdShownAt, setLastAdShownAt] = useState<number | null>(null);
    const [adTimings, setAdTimings] = useState(PROD_TIMINGS);

    const adMobFunctions = useRef<AdMobFunctions | null>(null);

    const incrementSearchCount = useCallback(() => {
        setSearchCount(prevCount => prevCount + 1);
    }, []);

    const resetSearchCount = useCallback(() => {
        console.log("[AdContext] Resetting search count to 0.");
        setSearchCount(0);
    }, []);

    const updateLastAdShownAt = useCallback(() => {
        const now = Date.now();
        console.log(`[AdContext] Updating last ad shown timestamp to ${now}`);
        setLastAdShownAt(now);
    }, []);

    const isCooldownActive = useCallback(() => {
        if (!lastAdShownAt) return false;
        const timeSinceLastAd = Date.now() - lastAdShownAt;
        return timeSinceLastAd < adTimings.COOLDOWN_MS;
    }, [lastAdShownAt, adTimings.COOLDOWN_MS]);

    const registerAdMobFunctions = useCallback((functions: AdMobFunctions) => {
        adMobFunctions.current = functions;
    }, []);

    const triggerAdShowOnSearch = useCallback((currentSearchCount: number) => {
        const isThresholdMet = currentSearchCount > 0 && currentSearchCount % SEARCH_THRESHOLD === 0;
        if (isThresholdMet) {
            const canShowAd = isInterstitialReady && !isAdShowing && !isCooldownActive();
            if (canShowAd) {
                console.log(`[AdContext] Ad trigger by SEARCH #${currentSearchCount}. Conditions met. Attempting to show ad.`);
                adMobFunctions.current?.showInterstitial();
            } else {
                console.log(`[AdContext] Ad trigger by SEARCH #${currentSearchCount} BLOCKED. Ready: ${isInterstitialReady}, Showing: ${isAdShowing}, Cooldown: ${isCooldownActive()}`);
            }
        }
    }, [isInterstitialReady, isAdShowing, isCooldownActive]);

    const timerCallback = useRef<() => void>();

    const attemptShowAdFromTimer = useCallback(() => {
        console.log(`[AdContext] Usage timer fired. Checking conditions.`);
        const canShowAd = isInterstitialReady && !isAdShowing && !isCooldownActive();

        if (canShowAd) {
            console.log(`[AdContext] Ad triggered by USAGE TIMER. Conditions met. Attempting to show ad.`);
            adMobFunctions.current?.showInterstitial();
        } else {
            console.log(`[AdContext] Ad triggered by USAGE TIMER but conditions not met. Ready: ${isInterstitialReady}, Showing: ${isAdShowing}, Cooldown: ${isCooldownActive()}`);
        }
    }, [isInterstitialReady, isAdShowing, isCooldownActive]);

    useEffect(() => {
        timerCallback.current = attemptShowAdFromTimer;
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('ad_test_mode') === 'true') {
            setAdTimings(TEST_TIMINGS);
            console.log(`[AdContext] App running in TEST mode. Using test ad timings: timer=30s, cooldown=60s.`);
        } else {
            setAdTimings(PROD_TIMINGS);
            console.log(`[AdContext] App running in PROD mode. Using standard ad timings: timer=10m, cooldown=10m.`);
        }
    }, []);

    useEffect(() => {
        const tick = () => {
            if (timerCallback.current) {
                timerCallback.current();
            }
        };
        const usageIntervalId = setInterval(tick, adTimings.USAGE_TIMER_MS);

        return () => {
            console.log(`[AdContext] Cleaning up persistent usage ad interval.`);
            clearInterval(usageIntervalId);
        };
    }, [adTimings.USAGE_TIMER_MS]);

    return (
        <AdContext.Provider value={{
            searchCount, incrementSearchCount, resetSearchCount,
            isInterstitialReady, setInterstitialReady,
            isAdShowing, setIsAdShowing,
            updateLastAdShownAt, isCooldownActive,
            registerAdMobFunctions,
            triggerAdShowOnSearch
        }}>
            {children}
        </AdContext.Provider>
    );
};

export const useAd = (): AdContextType => {
    const context = useContext(AdContext);
    if (context === undefined) {
        throw new Error('useAd must be used within an AdProvider');
    }
    return context;
};
