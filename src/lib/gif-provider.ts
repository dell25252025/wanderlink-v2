import { z } from 'zod';

// Schéma pour un GIF individuel de l'API GifSnap
const GifSnapGifSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
});

// Schéma pour la réponse complète de l'API GifSnap
const GifSnapResponseSchema = z.object({
  data: z.array(GifSnapGifSchema),
});

// L'interface interne 'Gif' reste inchangée pour ne pas impacter le reste de l'application.
export interface Gif {
  id: string;
  url: string;
  alt: string;
}

// Nouvelle URL de base pour l'API GifSnap
const API_BASE_URL = 'https://gifsnap.com/api/v1/gifs';
const API_LIMIT = 24;

// La fonction principale est adaptée pour appeler directement l'API externe et valider sa réponse.
async function fetchAndValidateGifs(url: string, signal?: AbortSignal): Promise<Gif[]> {
  try {
    const response = await fetch(url, { signal, cache: 'no-store' });

    if (!response.ok) {
      let errorPayload = { message: `Réponse d'erreur vide de l'API GIF (status ${response.status}).` };
      try {
        errorPayload = await response.json();
      } catch (e) { /* Le corps n'est pas du JSON, on ignore */ }
      
      console.error(
        `[GIF_PROVIDER_ERROR] La requête vers l'API a échoué. Statut: ${response.status}. Message: ${errorPayload.message}`
      );
      throw new Error(`Erreur de l'API GIF (${response.status}).`);
    }

    const data = await response.json();
    // Validation avec le nouveau schéma Zod
    const parsed = GifSnapResponseSchema.parse(data);

    // Transformation des données de GifSnap vers l'interface interne 'Gif'
    return parsed.data.map((gifSnapGif) => ({
      id: gifSnapGif.id,
      url: gifSnapGif.url,
      alt: gifSnapGif.title,
    }));

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erreur de validation Zod pour la réponse de GifSnap:', error.issues);
      throw new Error("La réponse de l'API GIF est invalide.");
    }
    
    // Journalise l'erreur si elle n'a pas déjà été traitée
    if (error instanceof Error && !error.message.includes("Erreur de l'API GIF")) {
        console.error('[GIF_PROVIDER_FATAL] Exception inattendue:', error.message);
    }
    
    throw error;
  }
}

// La fonction de recherche est mise à jour pour utiliser le nouvel endpoint.
export function searchGifs(query: string, signal?: AbortSignal): Promise<Gif[]> {
  const url = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&page=1&limit=${API_LIMIT}`;
  return fetchAndValidateGifs(url, signal);
}

// La fonction des tendances est mise à jour pour utiliser le nouvel endpoint.
export function getTrendingGifs(signal?: AbortSignal): Promise<Gif[]> {
  const url = `${API_BASE_URL}/trending?page=1&limit=${API_LIMIT}`;
  return fetchAndValidateGifs(url, signal);
}
