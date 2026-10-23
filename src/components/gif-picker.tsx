import { useEffect, useState, useCallback, useTransition } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { getGifsByReaction, type Gif } from '@/lib/gif-provider';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const gifCategories: { label: string; key: string }[] = [
  { label: 'Wave', key: 'wave' },
  { label: 'Cry', key: 'cry' },
  { label: 'Thumbs Up', key: 'thumbsup' },
  { label: 'Shrug', key: 'shrug' },
  { label: 'Surprised', key: 'surprised' },
];

interface GifPickerProps {
  onGifSelect: (url: string) => void;
}

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [activeCategory, setActiveCategory] = useState(gifCategories[0].key);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadGif = useCallback((category: string) => {
    startTransition(async () => {
      try {
        setError(null);
        const newGifs = await getGifsByReaction(category);
        setGifs(newGifs);
      } catch (err) {
        console.error(`Impossible de charger le GIF pour la catégorie ${category}:`, err);
        setError('Erreur lors du chargement du GIF.');
        setGifs([]);
      }
    });
  }, []);

  useEffect(() => {
    loadGif(activeCategory);
  }, [activeCategory, loadGif]);

  return (
    <div className="h-full w-full flex flex-col p-2">
      <div className="flex items-center space-x-2 border-b pb-2 mb-2 overflow-x-auto">
        {gifCategories.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            className="shrink-0"
          >
            {cat.label}
          </Button>
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        {isPending ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : error ? (
          <div className="text-center text-red-500">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => loadGif(activeCategory)}>Réessayer</Button>
          </div>
        ) : gifs.length > 0 ? (
          <div className="flex flex-col items-center gap-4">
            <button 
              key={gifs[0].url} 
              className="rounded-lg overflow-hidden border bg-secondary/50" 
              onClick={() => onGifSelect(gifs[0].url)}
            >
              <Image src={gifs[0].url} alt={gifs[0].anime} width={150} height={150} unoptimized className="object-cover" />
            </button>
            <Button variant="outline" size="sm" onClick={() => loadGif(activeCategory)}>
              <RefreshCw className="mr-2 h-4 w-4"/>
              Autre GIF
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Aucun GIF trouvé.</p>
        )}
      </div>
    </div>
  );
}
