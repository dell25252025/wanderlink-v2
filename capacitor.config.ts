
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderlink.app',
  appName: 'WanderLink',
  webDir: 'out',
  server: {
    url: 'https://googleads.github.io/googleads-mobile-android-examples/webview-api/index.html',
    cleartext: true
  },
  plugins: {
    // Configuration pour les notifications Push
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
      channels: [
        {
          id: "messages", // ID unique du canal
          name: "Messages", // Nom visible par l'utilisateur
          description: "Notifications pour les nouveaux messages",
          importance: 5, // Importance maximale pour faire apparaître la notif
          visibility: 1, // Visible sur l'écran de verrouillage
          sound: "default", // Son par défaut
          vibration: true, // Activer la vibration
        },
      ],
    },
    // On ajoute la configuration pour le Splash Screen
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
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
