import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/main.css'  // ← This line must be here
//import { SpeedInsights } from "@vercel/speed-insights/next"

// Suppress console logging in production builds
// console.warn and console.error are preserved for security monitoring
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)