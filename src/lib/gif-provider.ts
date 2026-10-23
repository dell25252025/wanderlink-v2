import { z } from 'zod';

// 1. Schémas de validation avec Zod pour la robustesse
const ReactionSchema = z.string();
const GifSchema = z.object({
  gif: z.string().url(),
});

const ReactionsResponseSchema = z.array(ReactionSchema);
const GifsResponseSchema = z.array(GifSchema);

// 2. Types dérivés des schémas
export type Reaction = z.infer<typeof ReactionSchema>;
export type Gif = z.infer<typeof GifSchema>;

// 3. URL de base de l'API
const API_BASE_URL = 'https://gifukai.fly.dev';

// 4. Fonction générique pour les appels fetch
async function fetchAndValidate<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Erreur réseau: ${response.statusText}`);
    }
    const data = await response.json();
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erreur de validation Zod:', error.issues);
      throw new Error('La réponse de l\'API GIF est invalide.');
    }
    throw error;
  }
}

// 5. Fonctions exportées pour être utilisées par les composants

/**
 * Récupère la liste des réactions (catégories) de GIFs disponibles.
 */
export function getReactions(signal?: AbortSignal): Promise<Reaction[]> {
  return fetchAndValidate(`${API_BASE_URL}/reactions`, ReactionsResponseSchema, signal);
}

/**
 * Récupère les GIFs correspondant à une réaction spécifique.
 * @param reaction - La catégorie de GIFs à récupérer.
 */
export function getGifsByReaction(reaction: string, signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidate(`${API_BASE_URL}/gifs/reaction/${encodeURIComponent(reaction)}`, GifsResponseSchema, signal);
}

/**
 * Recherche des GIFs à partir d'une requête textuelle.
 * @param query - Le terme de recherche.
 */
export function searchGifs(query: string, signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidate(`${API_BASE_URL}/gifs/search?q=${encodeURIComponent(query)}`, GifsResponseSchema, signal);
}
