import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
   <StrictMode>
    {/* GitHub Pages 서브폴더용 basename 설정 */}
   <BrowserRouter basename="/parents-web">   
           <App />         
   </BrowserRouter>
  </StrictMode>,
)
