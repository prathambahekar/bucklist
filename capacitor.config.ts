import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bucklist.app',
  appName: 'Bucklist',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
