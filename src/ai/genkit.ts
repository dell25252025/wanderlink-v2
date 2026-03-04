import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    // Configure le plugin Google AI avec la clé API des variables d'environnement.
    // Assurez-vous d'avoir un fichier .env.local avec GEMINI_API_KEY défini.
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // Utilise le modèle Gemini Pro comme demandé.
  model: 'googleai/gemini-pro',
});
