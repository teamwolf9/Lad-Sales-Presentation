import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import './styles/tokens.css'
import './styles/global.css'
import './styles/app.css'
import './styles/presentation.css'
import './styles/slides.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary label="The app hit an error" onReset={() => window.location.reload()}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
