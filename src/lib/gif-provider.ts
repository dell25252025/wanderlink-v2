import { z } from 'zod';

const TenorGifSchema = z.object({
  id: z.string(),
  content_description: z.string(),
  media_formats: z.object({
    gif: z.object({ 
      url: z.string().url(),
      dims: z.array(z.number()),
    }),
  }),
});

const TenorResponseSchema = z.object({
  results: z.array(TenorGifSchema),
});

export interface Gif {
  id: string;
  url: string;
  alt: string;
}

const API_BASE_URL = '/api/gifs';

async function fetchAndValidateGifs(url: string, signal?: AbortSignal): Promise<Gif[]> {
  try {
    const response = await fetch(url, { signal, cache: 'no-store' });

    if (!response.ok) {
      let errorPayload = { message: 'Réponse d\'erreur vide.' };
      try {
        errorPayload = await response.json();
      } catch (e) { /* Le corps n\'est pas du JSON, on ignore */ }
      
      console.error(
        `[GIF_PROVIDER_ERROR] La requête vers le proxy a échoué. Statut: ${response.status}. Message: ${errorPayload.message}`
      );
      throw new Error(`Erreur du serveur (${response.status}).`);
    }

    const data = await response.json();
    const parsed = TenorResponseSchema.parse(data);

    return parsed.results.map((tenorGif) => ({
      id: tenorGif.id,
      url: tenorGif.media_formats.gif.url,
      alt: tenorGif.content_description,
    }));

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erreur de validation Zod pour la réponse de Tenor:', error.issues);
      throw new Error("La réponse de l'API GIF est invalide.");
    }
    
    // Journalise l'erreur si elle n'a pas déjà été traitée
    if (error instanceof Error && !error.message.includes('Erreur du serveur')) {
        console.error('[GIF_PROVIDER_FATAL] Exception inattendue:', error.message);
    }
    
    throw error;
  }
}

export function searchGifs(query: string, signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidateGifs(`${API_BASE_URL}?q=${encodeURIComponent(query)}`, signal);
}

export function getTrendingGifs(signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidateGifs(API_BASE_URL, signal);
}
