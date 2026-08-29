import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { MOCK, seedMockSession, installMockFetch } from './mock'
import { PrivyProvider } from '@privy-io/react-auth'
import { PRIVY_APP_ID, privyConfig } from './privy'

// MOCK MODE (npm run mock): skips Login/PIN, blocks the network, feeds fake data. NEVER in production.
if (MOCK) { seedMockSession(); installMockFetch() }

// PrivyProvider wraps the app even in MOCK mode. It has to: the hooks inside App.jsx throw if no
// provider is above them, and React does not allow calling them conditionally. MOCK stays safe
// because App.jsx reads the seeded localStorage session and never waits on Privy - the provider
// just sits there unused.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <App />
    </PrivyProvider>
  </React.StrictMode>
)
