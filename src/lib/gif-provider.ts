import { z } from 'zod';

const GifSchema = z.object({
  url: z.string().url(),
  anime: z.string(),
});

const GifsResponseSchema = z.array(GifSchema);

export type Gif = z.infer<typeof GifSchema>;

const API_BASE_URL = '/api/gifs';

async function fetchAndValidate<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(url, { signal }); 
    if (!response.ok) {
      // Log pour l'erreur réseau
      console.error(`[GIF_PROVIDER_ERROR] Erreur réseau: ${response.status} ${response.statusText}`);
      throw new Error(`Erreur réseau: ${response.statusText}`);
    }
    const data = await response.json();

    // --- AJOUT POUR LE DÉBOGAGE ---
    // Affiche la donnée brute reçue avant la validation.
    console.log('[GIF_PROVIDER_DEBUG] Donnée brute reçue du proxy:', JSON.stringify(data, null, 2));
    // --- FIN DE L'AJOUT POUR LE DÉBOGAGE ---

    return schema.parse(data);

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log plus détaillé pour l'erreur de validation
      console.error('[GIF_PROVIDER_ERROR] Erreur de validation Zod. Détails:', JSON.stringify(error.issues, null, 2));
      throw new Error("La réponse de l'API GIF est invalide.");
    }
    console.error('[GIF_PROVIDER_ERROR] Erreur inattendue dans fetchAndValidate:', error);
    throw error;
  }
}

export function getGifsByReaction(reaction: string, signal?: AbortSignal): Promise<Gif[]> {
  return fetchAndValidate(`${API_BASE_URL}?reaction=${encodeURIComponent(reaction)}`, GifsResponseSchema, signal);
}
