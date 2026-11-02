import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global URL navigation guard: strictly block any unvetted external routing (e.g. metacpan or external links)
if (typeof window !== 'undefined') {
  window.addEventListener(
    'click',
    (e) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href) {
        const isInternal =
          target.href.startsWith(window.location.origin) ||
          target.href.startsWith('file://') ||
          target.href.startsWith('javascript:');
        if (!isInternal && !target.href.startsWith('mailto:') && !target.href.startsWith('tel:')) {
          e.preventDefault();
          e.stopPropagation();
          console.warn('PodoPress Security: Intercepted and blocked external routing to:', target.href);
        }
      }
    },
    true
  );

  // Prevent accidental Escape routing
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
