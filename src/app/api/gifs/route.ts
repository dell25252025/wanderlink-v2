import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const apiKey = process.env.TENOR_API_KEY;
  const requestId = `gif-${Date.now()}`;

  console.log(`[${requestId}] Début du traitement. Recherche: "${query || 'tendances'}"`);

  if (!apiKey) {
    console.error(`[${requestId}] ERREUR_CRITIQUE: Clé d'API Tenor (TENOR_API_KEY) non trouvée. Assurez-vous qu'elle est définie dans les secrets de l'environnement.`);
    return NextResponse.json({ error: "Configuration du serveur incorrecte." }, { status: 500 });
  }
  
  console.log(`[${requestId}] Clé d'API Tenor détectée.`);

  const API_BASE_URL = 'https://tenor.googleapis.com/v2';
  const clientKey = 'wanderlink-v2';
  const limit = 24;
  let fetchUrl: string;

  if (query) {
    fetchUrl = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&key=${apiKey}&client_key=${clientKey}&limit=${limit}`;
  } else {
    fetchUrl = `${API_BASE_URL}/featured?key=${apiKey}&client_key=${clientKey}&limit=${limit}`;
  }

  try {
    console.log(`[${requestId}] Appel de l'API Tenor...`);
    const tenorResponse = await fetch(fetchUrl, { headers: { 'Accept': 'application/json' } });

    if (!tenorResponse.ok) {
      const errorBody = await tenorResponse.text().catch(() => 'N/A');
      console.error(`[${requestId}] ERREUR_API_TENOR: Tenor a répondu avec le statut ${tenorResponse.status}. Corps: ${errorBody}`);
      return NextResponse.json(
        { error: `Le fournisseur de GIF a retourné une erreur ${tenorResponse.status}` },
        { status: tenorResponse.status }
      );
    }

    const data = await tenorResponse.json();
    console.log(`[${requestId}] SUCCÈS: Données reçues de Tenor.`);
    return NextResponse.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error(`[${requestId}] ERREUR_FATALE_PROXY: L'appel fetch vers Tenor a échoué. Cause: ${errorMessage}`);
    return NextResponse.json({ error: 'Erreur interne lors de la communication avec le fournisseur de GIF.' }, { status: 500 });
  }
}
