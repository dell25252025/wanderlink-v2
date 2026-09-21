'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useRef } from 'react';

const COOLDOWN_MINUTES = 10;
const SEARCH_THRESHOLD = 3;

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

    const triggerAdShowOnSearch = useCallback((currentSearchCount: number) => {
        const canShowAd = currentSearchCount >= SEARCH_THRESHOLD &&
                          isInterstitialReady &&
                          !isAdShowing &&
                          !isCooldownActive();

        if (canShowAd) {
            console.log("[AdContext] Conditions met. Attempting to show interstitial ad.");
            if (adMobFunctions.current?.showInterstitial) {
                // Fire-and-forget, the search flow does not wait for this.
                adMobFunctions.current.showInterstitial();
            } else {
                console.warn("[AdContext] Wanted to show ad, but showInterstitial function is not registered.");
            }
        } else {
            console.log(`[AdContext] Conditions not met. Search count: ${currentSearchCount}, Ready: ${isInterstitialReady}, Showing: ${isAdShowing}, Cooldown: ${isCooldownActive()}`);
        }
    }, [isInterstitialReady, isAdShowing, isCooldownActive]);

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
