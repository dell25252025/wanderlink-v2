'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useRef, useEffect } from 'react';

const COOLDOWN_MINUTES = 10;
const SEARCH_THRESHOLD = 3;
const USAGE_TIMER_MINUTES = 10;

// --- Type Definitions ---

interface AdMobFunctions {
  showInterstitial: () => Promise<void>;
  prepareInterstitial: () => Promise<void>;
}

interface AdContextType {
  // State & Getters
  searchCount: number;
  isInterstitialReady: boolean;
  isAdShowing: boolean;
  isCooldownActive: () => boolean;

  // State Modifiers
  incrementSearchCount: () => void;
  resetSearchCount: () => void;
  setInterstitialReady: (isReady: boolean) => void;
  setIsAdShowing: (isShowing: boolean) => void;
  updateLastAdShownAt: () => void;
  
  // Core Logic
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
        const minutesSinceLastAd = (Date.now() - lastAdShownAt) / (1000 * 60);
        return minutesSinceLastAd < COOLDOWN_MINUTES;
    }, [lastAdShownAt]);

    const registerAdMobFunctions = useCallback((functions: AdMobFunctions) => {
        adMobFunctions.current = functions;
    }, []);

    // --- UNCHANGED: Search-based Ad Trigger ---
    const triggerAdShowOnSearch = useCallback((currentSearchCount: number) => {
        const isThresholdMet = currentSearchCount > 0 && currentSearchCount % SEARCH_THRESHOLD === 0;

        if (isThresholdMet) {
            const canShowAd = isInterstitialReady && !isAdShowing && !isCooldownActive();
            if (canShowAd) {
                console.log(`[AdContext] Conditions met for search #${currentSearchCount}. Attempting to show interstitial ad.`);
                adMobFunctions.current?.showInterstitial();
            } else {
                console.log(`[AdContext] Ad trigger by search #${currentSearchCount} BLOCKED. Ready: ${isInterstitialReady}, Showing: ${isAdShowing}, Cooldown: ${isCooldownActive()}`);
            }
        }
    }, [isInterstitialReady, isAdShowing, isCooldownActive]);

    // --- NEW: Independent Usage Timer Logic ---
    const attemptShowAdFromTimer = useCallback(() => {
        console.log(`[AdContext] ${USAGE_TIMER_MINUTES}-minute usage timer fired. Checking conditions.`);
        const canShowAd = isInterstitialReady && !isAdShowing && !isCooldownActive();

        if (canShowAd) {
            console.log(`[AdContext] Ad triggered by USAGE TIMER. Conditions met. Attempting to show ad.`);
            if (adMobFunctions.current?.showInterstitial) {
                adMobFunctions.current.showInterstitial();
            } else {
                console.warn("[AdContext] Usage Timer: Wanted to show ad, but showInterstitial function is not registered.");
            }
        } else {
            console.log(`[AdContext] Ad triggered by USAGE TIMER but conditions not met. Will try again on next interval. Ready: ${isInterstitialReady}, Showing: ${isAdShowing}, Cooldown: ${isCooldownActive()}`);
        }
    }, [isInterstitialReady, isAdShowing, isCooldownActive]);

    useEffect(() => {
        console.log(`[AdContext] Setting up ${USAGE_TIMER_MINUTES}-minute usage ad interval.`);
        const usageIntervalId = setInterval(attemptShowAdFromTimer, USAGE_TIMER_MINUTES * 60 * 1000);

        return () => {
            console.log(`[AdContext] Cleaning up ${USAGE_TIMER_MINUTES}-minute usage ad interval.`);
            clearInterval(usageIntervalId);
        };
    }, [attemptShowAdFromTimer]);
    // --- END: New Timer Logic ---

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

// --- Hook ---

export const useAd = (): AdContextType => {
    const context = useContext(AdContext);
    if (context === undefined) {
        throw new Error('useAd must be used within an AdProvider');
    }
    return context;
};
