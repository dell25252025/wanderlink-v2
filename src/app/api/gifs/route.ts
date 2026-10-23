import { NextResponse } from 'next/server';

// This function handles GET requests to /api/gifs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const apiKey = process.env.TENOR_API_KEY;

  if (!apiKey) {
    console.error("La clé d'API Tenor est manquante.");
    return NextResponse.json({ error: 'Configuration serveur incorrecte.' }, { status: 500 });
  }

  const API_BASE_URL = 'https://tenor.googleapis.com/v2';
  const clientKey = 'wanderlink-v2'; // Recommended to identify our app to Tenor
  const limit = 24; // Number of GIFs to fetch

  let fetchUrl: string;

  if (query) {
    // --- Search request ---
    fetchUrl = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&key=${apiKey}&client_key=${clientKey}&limit=${limit}`;
  } else {
    // --- Trending request ---
    fetchUrl = `${API_BASE_URL}/featured?key=${apiKey}&client_key=${clientKey}&limit=${limit}`;
  }

  try {
    const tenorResponse = await fetch(fetchUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!tenorResponse.ok) {
      console.error(`Erreur de l'API Tenor: ${tenorResponse.status} ${tenorResponse.statusText}`);
      return NextResponse.json(
        { error: `Erreur externe de l'API: ${tenorResponse.statusText}` },
        { status: tenorResponse.status }
      );
    }

    const data = await tenorResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur dans la route proxy des GIFs:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
