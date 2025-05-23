import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'       // ← 추가
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
   <StrictMode>
    <BrowserRouter basename="/parents-web">              {/* ← 여기 basename 설정 */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)
