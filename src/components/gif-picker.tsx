import { useEffect, useState, useTransition, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';
import { getTrendingGifs, searchGifs, type Gif } from '@/lib/gif-provider';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

interface GifPickerProps {
  onGifSelect: (url: string) => void;
}

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms debounce delay

  const loadGifs = useCallback((term: string) => {
    startTransition(async () => {
      try {
        setError(null);
        const newGifs = term
          ? await searchGifs(term)
          : await getTrendingGifs();
        setGifs(newGifs);
        if (newGifs.length === 0) {
          setError('Aucun GIF trouvé pour cette recherche.');
        }
      } catch (err) {
        console.error(`Impossible de charger les GIFs pour la recherche "${term}":`, err);
        setError('Une erreur est survenue lors du chargement des GIFs.');
        setGifs([]);
      }
    });
  }, []);

  useEffect(() => {
    loadGifs(debouncedSearchTerm);
  }, [debouncedSearchTerm, loadGifs]);

  return (
    <div className="h-full w-full flex flex-col p-2 gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un GIF..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex-1 flex items-center justify-center">
        {isPending ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 overflow-y-auto h-full w-full">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                className="aspect-square rounded-md overflow-hidden bg-muted hover:ring-2 hover:ring-primary ring-offset-2 ring-offset-background"
                onClick={() => onGifSelect(gif.url)}
              >
                <Image
                  src={gif.url}
                  alt={gif.alt}
                  width={150}
                  height={150}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center">{error || 'Recherchez un GIF ou découvrez les tendances.'}</p>
        )}
      </div>
    </div>
  );
}
