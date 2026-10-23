import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ServerCrash } from 'lucide-react';
import { getReactions, getGifsByReaction, searchGifs, type Reaction, type Gif } from '@/lib/gif-provider';
import { useDebounce } from '@/hooks/use-debounce';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Récupérer les catégories au montage
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    getReactions(controller.signal)
      .then(setReactions)
      .catch(() => setError('Impossible de charger les catégories.'))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  // Gérer la recherche ou la sélection de catégorie
  const fetchGifs = useCallback(async (query: string, reaction?: string) => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setGifs([]); // Vider les GIFs précédents

    try {
      const results = query
        ? await searchGifs(query, controller.signal)
        : await getGifsByReaction(reaction || reactions[0], controller.signal);
      setGifs(results);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError('Aucun GIF trouvé ou une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  }, [reactions]); // Dépend de `reactions` pour la première charge

  // Charger les GIFs populaires (la première catégorie) au début
  useEffect(() => {
    if (reactions.length > 0) {
      fetchGifs('', reactions[0]);
    }
  }, [reactions, fetchGifs]);

  // Lancer une recherche lorsque la requête (débauncée) change
  useEffect(() => {
    if (debouncedSearchQuery) {
      fetchGifs(debouncedSearchQuery);
    } else if (reactions.length > 0) {
      // Revenir aux GIFs populaires si la recherche est vide
      fetchGifs('', reactions[0]);
    }
  }, [debouncedSearchQuery, reactions, fetchGifs]);

  const handleReactionClick = (reaction: string) => {
    setSearchQuery(''); // Réinitialiser la recherche
    fetchGifs('', reaction);
  };

  return (
    <div className="h-full flex flex-col p-2 bg-background">
      <Input
        type="text"
        placeholder="Rechercher des GIFs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-2"
      />
      <div className="mb-2 flex flex-wrap gap-1">
        {reactions.map((reaction) => (
          <Button
            key={reaction}
            variant="outline"
            size="sm"
            onClick={() => handleReactionClick(reaction)}
          >
            {reaction}
          </Button>
        ))}
      </div>
      <div className="flex-grow overflow-y-auto relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <ServerCrash className="h-10 w-10 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
        {!loading && !error && gifs.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Aucun GIF à afficher.</p>
            </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {gifs.map((gif, index) => (
            <button
              key={`${gif.gif}-${index}`}
              onClick={() => onGifSelect(gif.gif)}
              className="aspect-square bg-secondary rounded-md overflow-hidden hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img src={gif.gif} alt="GIF" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
