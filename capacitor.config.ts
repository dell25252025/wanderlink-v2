
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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'VOTRE_WEB_CLIENT_ID.apps.googleusercontent.com'
    }
  }
};

export default config;
