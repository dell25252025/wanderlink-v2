"use client";

import { createContext, useContext, useState } from "react";

type NavigationContextType = {
  pendingRoute: string | null;
  setPendingRoute: (route: string | null) => void;
};

const NavigationContext = createContext<NavigationContextType>({
  pendingRoute: null,
  setPendingRoute: () => {},
});

export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  return (
    <NavigationContext.Provider value={{ pendingRoute, setPendingRoute }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => useContext(NavigationContext);