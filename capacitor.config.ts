
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderlink.app',
  appName: 'WanderLink',
  webDir: 'out', // MUST point to 'out' for static export bundle
  android: {
    webContentsDebuggingEnabled: true,
  },
  server: {
<<<<<<< HEAD
    // CRITICAL FIX: Force HTTPS scheme for local files to enable WebRTC/getUserMedia
    // By default, Capacitor uses 'http' which WebView may treat as insecure.
    androidScheme: 'https',
    
    // Ensure we are NOT using a live reload URL for production build
    // url: 'http://192.168.100.26:3000', 
    cleartext: true
=======
    hostname: 'localhost',
    url: 'http://localhost:3000',
    cleartext: true,
    androidScheme: 'https'
>>>>>>> fix/call-logic
  }
};

export default config;
