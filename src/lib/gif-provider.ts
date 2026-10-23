import { z } from 'zod';

// Schéma Zod pour valider un seul GIF de la réponse Tenor
// Nous ne prenons que ce dont nous avons besoin : l'URL du GIF et sa description.
const TenorGifSchema = z.object({
  id: z.string(),
  content_description: z.string(),
  media_formats: z.object({
    // Tenor propose plusieurs formats, `gif` est un bon compromis taille/qualité
    gif: z.object({ 
      url: z.string().url(),
      dims: z.array(z.number()),
    }),
  }),
});

// Schéma pour la réponse complète de l'API Tenor
const TenorResponseSchema = z.object({
  results: z.array(TenorGifSchema),
});

// Notre type de GIF interne, simplifié.
export interface Gif {
  id: string;
  url: string;
  alt: string;
}

const API_BASE_URL = '/api/gifs'; // Notre proxy interne

async function fetchAndValidateGifs(url: string, signal?: AbortSignal): Promise<Gif[]> {
  try {
    const response = await fetch(url, { signal, cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Erreur réseau: ${response.statusText}`);
    }
    const data = await response.json();

    const parsed = TenorResponseSchema.parse(data);

    // Transformation de la réponse de Tenor en notre format de données interne
    return parsed.results.map((tenorGif) => ({
      id: tenorGif.id,
      url: tenorGif.media_formats.gif.url,
      alt: tenorGif.content_description,
    }));

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erreur de validation Zod pour Tenor:', error.issues);
      throw new Error("La réponse de l'API Tenor est invalide.");
    }
    console.error('Erreur inattendue dans fetchAndValidateGifs:', error);
    throw error;
  }
}

/**
 * Recherche des GIFs en utilisant notre proxy.
 * @param query - Le terme de recherche.
 */
export function searchGifs(query: string, signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidateGifs(`${API_BASE_URL}?q=${encodeURIComponent(query)}`, signal);
}

/**
 * Récupère les GIFs tendances via notre proxy.
 */
export function getTrendingGifs(signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidateGifs(API_BASE_URL, signal);
}
