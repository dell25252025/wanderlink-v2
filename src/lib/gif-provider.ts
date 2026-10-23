import { z } from 'zod';

// Le schéma de base pour UN seul GIF. Il correspond maintenant à ce que l'API renvoie.
const GifSchema = z.object({
  url: z.string().url(),
  anime: z.string(),
});

// Le schéma pour la réponse complète de l'API. C'est un objet, pas un tableau.
const ApiResponseSchema = GifSchema;

export type Gif = z.infer<typeof GifSchema>;

const API_BASE_URL = '/api/gifs';

async function fetchAndValidate<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(url, { signal, cache: 'no-store' }); // Ajout de no-cache pour obtenir de nouveaux GIFs
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

/**
 * Récupère UN GIF aléatoire pour une réaction donnée et le renvoie dans un tableau.
 * @param reaction - La catégorie de GIFs à récupérer (ex: 'wave', 'cry').
 */
export async function getGifsByReaction(reaction: string, signal?: AbortSignal): Promise<Gif[]> {
  // On récupère l'objet GIF unique
  const singleGif = await fetchAndValidate(`${API_BASE_URL}?reaction=${encodeURIComponent(reaction)}`, ApiResponseSchema, signal);
  
  // On le retourne sous forme d'un tableau contenant un seul élément
  // pour que le composant qui fait le .map() puisse fonctionner.
  return [singleGif];
}
