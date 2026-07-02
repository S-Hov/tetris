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
import { AudioProvider } from './shared/context/AudioProvider.jsx'
import { AuthProvider } from './shared/context/AuthContext.jsx'
import { initAccentColor } from './shared/lib/accent-color/accentColor.js'
import { initGlowEffect } from './shared/lib/glow-effect/glowEffect.js'
import { initInterfaceBlurSettings } from './shared/lib/interface-blur/blur.js'
import { initInterfaceRadiusSettings } from './shared/lib/interface-radius/radius.js'
import { initInterfaceScale } from './shared/lib/interface-scale/scale.js'
import { initTheme } from './shared/lib/theme/theme.js'

initTheme()
initGlowEffect()
initInterfaceRadiusSettings()
initInterfaceBlurSettings()
initInterfaceScale()
initAccentColor()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <AudioProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </AudioProvider>
    </HelmetProvider>
  </React.StrictMode>
)
