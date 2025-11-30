import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderlink.app',
  appName: 'WanderLink',
  webDir: 'out',
  server: {
    url: 'https://wanderlink-v2--wanderlink-c1a35.us-east4.hosted.app',
    cleartext: true
  }
};

export default config;
