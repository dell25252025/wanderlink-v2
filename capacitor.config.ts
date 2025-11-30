
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderlink.app',
  appName: 'WanderLink',
  webDir: 'src',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
