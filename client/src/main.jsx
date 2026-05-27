import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import './app/styles/reset.css'
import './app/styles/variables.css'
import './app/styles/base.css'
import './app/styles/animations.css'
import './i18n'

import App from './app/App.jsx'
import { AuthProvider } from './shared/context/AuthContext.jsx'
import { initGlowEffect } from './shared/lib/glow-effect/glowEffect.js'
import { initTheme } from './shared/lib/theme/theme.js'

initTheme()
initGlowEffect()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>
)
