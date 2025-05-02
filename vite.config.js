import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/parents-web/',   // 그대로!
  plugins: [react()],
});
