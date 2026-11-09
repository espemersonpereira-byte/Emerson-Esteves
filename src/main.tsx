import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear any stale Service Worker / CacheStorage icon caches once per icon version update
const ICON_CACHE_VERSION = 'freelas_icon_v20261102';
try {
  if (localStorage.getItem('freelas_icon_cache_version') !== ICON_CACHE_VERSION) {
    localStorage.setItem('freelas_icon_cache_version', ICON_CACHE_VERSION);
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          caches.delete(key).catch(() => {});
        });
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          reg.update().catch(() => {});
        });
      });
    }
  }
} catch {}

createRoot(document.getElementById('root')!).render(<App />);
