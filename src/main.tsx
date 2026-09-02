import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

// Guard against cross-origin unhandled errors or blocked Web Audio calls
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Prevent benign promise rejections (like audio blocked or cancelled fetches) from creating console noise
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.' || event.message?.includes('ResizeObserver')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
