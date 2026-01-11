
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderlink.app',
  appName: 'WanderLink',
  webDir: 'out',
  server: {
    url: 'https://wanderlink-v2--wanderlink-c1a35.us-east4.hosted.app/',
    cleartext: true
  },
  plugins: {
    // On ajoute la configuration pour le Splash Screen
    SplashScreen: {
      launchShowDuration: 3000, // Le splash screen reste affiché 3 secondes
      launchAutoHide: true, // On force le masquage automatique pour éviter le blocage
      backgroundColor: "#ffffff", // Mettez la couleur de fond de votre splash
      androidSplashResourceName: "splash", // Le nom de votre fichier de splash screen
      androidScaleType: "CENTER_CROP",
      showSpinner: false, // On peut masquer le spinner si on a une animation
      splashFullScreen: true,
      splashImmersive: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com'
    }
  }
};

export default config;
