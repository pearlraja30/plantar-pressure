import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.technomind.plantarpressure',
  appName: 'Plantar Pressure Analysis',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
};

export default config;
