import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { FriendsProvider } from './friends/FriendsProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FriendsProvider>
        <App />
      </FriendsProvider>
    </AuthProvider>
  </StrictMode>,
)
