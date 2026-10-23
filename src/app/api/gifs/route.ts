import { NextResponse } from 'next/server';

// This function handles GET requests to /api/gifs
export async function GET(request: Request) {
  // 1. Extract the 'reaction' parameter from the request URL
  const { searchParams } = new URL(request.url);
  const reaction = searchParams.get('reaction');

  // 2. If the parameter is missing, return an error
  if (!reaction) {
    return NextResponse.json({ error: 'The reaction parameter is missing' }, { status: 400 });
  }

  // 3. Build the external API URL
  const API_BASE_URL = 'https://api.gifukai.com/v1';
  const fetchUrl = `${API_BASE_URL}/${encodeURIComponent(reaction)}`;

  try {
    // 4. Call the external API (server-to-server, so no CORS issue)
    const apiResponse = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });

    // 5. If the external API returns an error, forward it to the client
    if (!apiResponse.ok) {
      console.error(`External Gifukai API error: ${apiResponse.status} ${apiResponse.statusText}`);
      return NextResponse.json(
        { error: `External API error: ${apiResponse.statusText}` },
        { status: apiResponse.status }
      );
    }

    // 6. Read the JSON response from the external API
    const data = await apiResponse.json();
    
    // 7. Return the response to the client (the GifPicker)
    // Next.js will automatically add the correct CORS headers for our own frontend.
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in the GIF proxy route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
