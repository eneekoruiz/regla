import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.aura.privatecycle',
  appName: 'Aura',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  ios: { contentInset: 'always' },
};
export default config;
