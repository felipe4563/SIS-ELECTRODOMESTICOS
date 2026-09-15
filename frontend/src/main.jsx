import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// En producción, cuando el service worker detecta una versión nueva de la app,
// la aplicamos y recargamos la página solos en vez de dejar al usuario con la
// versión vieja hasta que haga un hard refresh (Ctrl+Shift+R) por su cuenta.
const updateSW = registerSW({
  onNeedRefresh() { updateSW(true) },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
