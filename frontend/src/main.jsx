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
  onRegisteredSW(_url, registration) {
    // El navegador solo revisa si hay una versión nueva al navegar; en una
    // SPA el usuario puede dejar la pestaña abierta horas sin navegar nunca,
    // así que además se fuerza una revisión manual cada 10 minutos.
    if (!registration) return
    setInterval(() => registration.update(), 10 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
