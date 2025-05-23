// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
   // GitHub Pages 서브폴더용으로 바꿉니다
  base: '/parents-web/',
  plugins: [react()],
  optimizeDeps: {
    // 기존 exclude는 그대로 두시고,
    exclude: ['react-router-dom'],
    // 여기에 문제의 CJS 모듈들을 미리 포함시켜 줍니다.
    include: [
      'set-cookie-parser',
      'cookie'
    ]
  }
})
