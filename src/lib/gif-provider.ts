import { z } from 'zod';

// The Zod schema remains unchanged as the data structure we receive from the proxy is the same
const GifSchema = z.object({
  url: z.string().url(),
  anime: z.string(),
});

const GifsResponseSchema = z.array(GifSchema);

export type Gif = z.infer<typeof GifSchema>;

// MODIFICATION: The base URL now points to our own API proxy
const API_BASE_URL = '/api/gifs'; // Relative path to our API route

async function fetchAndValidate<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  try {
    // The fetch logic remains the same, only the URL changes
    const response = await fetch(url, { signal }); 
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    const data = await response.json();
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.issues);
      throw new Error("The GIF API response is invalid.");
    }
    throw error;
  }
}

/**
 * Fetches GIFs via our internal proxy to bypass the CORS issue.
 * @param reaction - The category of GIFs to fetch (e.g., 'wave', 'cry').
 */
export function getGifsByReaction(reaction: string, signal?: AbortSignal): Promise<Gif[]> {
  // MODIFICATION: Build the URL with a query parameter
  return fetchAndValidate(`${API_BASE_URL}?reaction=${encodeURIComponent(reaction)}`, GifsResponseSchema, signal);
}
