import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './app/styles/reset.css'
import './app/styles/variables.css'
import './app/styles/base.css'
import './app/styles/animations.css'

import App from './app/App.jsx'
import { AuthProvider } from './shared/context/AuthContext.jsx'
import { initTheme } from './shared/lib/theme/theme.js'

initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
