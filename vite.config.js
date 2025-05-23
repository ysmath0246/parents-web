// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 빌드 후 index.html과 같은 폴더에 assets 폴더가 있다고 가정하고
  base: './',
   plugins: [react()],
   optimizeDeps: {
     exclude: ['react-router-dom']
   }
})
