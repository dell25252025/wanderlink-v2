
'use client';

import { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';
import { DocumentData } from 'firebase/firestore';

// Définit la structure de l'objet des résultats de recherche
interface SearchResults {
  hits: DocumentData[];
  page: number;
  nbPages: number;
  searchOptions: any;
}

// Définit le type pour la valeur du contexte
interface SearchContextType {
  searchResults: SearchResults | null;
  setSearchResults: Dispatch<SetStateAction<SearchResults | null>>;
}

// Crée le contexte avec une valeur par défaut
const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Crée le fournisseur de contexte
export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  return (
    <SearchContext.Provider value={{ searchResults, setSearchResults }}>
      {children}
    </SearchContext.Provider>
  );
}

// Crée un hook personnalisé pour utiliser le contexte
export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
