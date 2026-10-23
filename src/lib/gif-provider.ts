import { z } from 'zod';

// 1. Schéma de validation Zod pour un seul GIF
// La réponse pour une réaction est un tableau de ces objets
const GifSchema = z.object({
  url: z.string().url(), // L'API renvoie bien un champ 'url'
  anime: z.string(), // Gardons cette information, même si nous ne l'utilisons pas
});

// Le schéma pour la réponse complète de l'API (un tableau de GIFs)
const GifsResponseSchema = z.array(GifSchema);

// 2. Type dérivé du schéma
export type Gif = z.infer<typeof GifSchema>;

// 3. URL de base de l'API
const API_BASE_URL = 'https://api.gifukai.com/v1';

// 4. Fonction générique pour les appels fetch, inchangée
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
      throw new Error("La réponse de l'API GIF est invalide.");
    }
    throw error;
  }
}

// 5. Fonction simplifiée pour récupérer les GIFs par réaction
/**
 * Récupère les GIFs correspondant à une réaction spécifique.
 * @param reaction - La catégorie de GIFs à récupérer (ex: 'wave', 'cry').
 */
export function getGifsByReaction(reaction: string, signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidate(`${API_BASE_URL}/${encodeURIComponent(reaction)}`, GifsResponseSchema, signal);
}
