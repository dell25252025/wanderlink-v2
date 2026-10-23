import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ServerCrash } from 'lucide-react';
import { getGifsByReaction, type Gif } from '@/lib/gif-provider';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

// Catégories fixes, comme demandé
const GIF_CATEGORIES = ['wave', 'cry', 'thumbsup', 'shrug', 'surprised'];

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(GIF_CATEGORIES[0]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchGifs = useCallback(async (category: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setGifs([]);

    try {
      const results = await getGifsByReaction(category, controller.signal);
      setGifs(results);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError('Aucun GIF trouvé ou une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les GIFs de la catégorie sélectionnée
  useEffect(() => {
    fetchGifs(selectedCategory);

    // Cleanup pour annuler le fetch si le composant est démonté
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedCategory, fetchGifs]);

  return (
    <div className="h-full flex flex-col p-2 bg-background">
      {/* Le champ de recherche est retiré pour respecter les contraintes */}
      
      {/* Onglets pour les catégories fixes */}
      <div className="mb-2 flex flex-wrap gap-1 border-b pb-2">
        {GIF_CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Grille d'affichage des GIFs */}
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
          {gifs.map((gif) => (
            <button
              key={gif.url} // Utiliser l'URL comme clé unique
              onClick={() => onGifSelect(gif.url)} // Passer l'URL
              className="aspect-square bg-secondary rounded-md overflow-hidden hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img src={gif.url} alt={`GIF for ${selectedCategory}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
