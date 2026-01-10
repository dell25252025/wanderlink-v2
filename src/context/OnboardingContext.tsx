
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type OnboardingMode = 'google' | 'email' | null;

interface OnboardingContextType {
  mode: OnboardingMode;
  setMode: (mode: OnboardingMode) => void;
  isOverlayActive: boolean;
  setOverlayActive: (isActive: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<OnboardingMode>(null);
  const [isOverlayActive, setOverlayActive] = useState(false);

  const value = {
    mode,
    setMode,
    isOverlayActive,
    setOverlayActive,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
