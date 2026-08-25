import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { MOCK, seedMockSession, installMockFetch } from './mock'

// MOCK MODE (npm run mock): skips Login/PIN, blocks the network, feeds fake data. NEVER in production.
if (MOCK) { seedMockSession(); installMockFetch() }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
