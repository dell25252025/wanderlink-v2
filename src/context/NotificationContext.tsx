
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Définir une interface pour les données de notification que nous allons stocker
interface NotificationData {
  type?: string;
  chatId?: string;
  // Ajoutez ici d'autres champs de données de notification si nécessaire
}

// Définir l'interface pour la valeur du contexte
interface NotificationContextType {
  notification: NotificationData | null;
  setNotification: (notification: NotificationData | null) => void;
}

// Créer le contexte avec une valeur par défaut
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Créer le composant Provider
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  return (
    <NotificationContext.Provider value={{ notification, setNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Créer un hook personnalisé pour utiliser facilement le contexte
export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
