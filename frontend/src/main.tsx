import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

try {
  gsap.registerPlugin(ScrollTrigger)
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }
  ScrollTrigger.clearScrollMemory('manual')
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
  window.scrollTo(0, 0)
} catch {
  // Ignore history/scroll guards in sandboxed contexts
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
