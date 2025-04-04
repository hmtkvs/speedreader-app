import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AppErrorBoundary } from './ErrorBoundary'
import { initializeMonitoring } from './monitoring'
import AppWithProviders from './features/app'
import { LandingPage } from './components/LandingPage'
import './index.css'

// Initialize monitoring
initializeMonitoring();

function Main() {
  const [showApp, setShowApp] = useState(false);
  
  return showApp ? (
    <AppErrorBoundary>
      <AppWithProviders />
    </AppErrorBoundary>
  ) : (
    <LandingPage onGetStarted={() => setShowApp(true)} />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>,
)