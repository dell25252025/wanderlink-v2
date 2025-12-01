
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderlink.app',
  appName: 'WanderLink',
  webDir: 'out',
  // The 'server' property is removed for production builds.
  // The app will be bundled and served from localhost internally.
  // We add androidScheme to force https, which is required for WebRTC (camera/mic access).
  server: {
    androidScheme: 'https'
  }
};

export default config;
