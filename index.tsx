import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker with robust update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      // Helper to show update prompt
      const showUpdatePrompt = () => {
        if (confirm('Nova versão disponível! Deseja atualizar agora?')) {
          window.location.reload();
        }
      };

      // 1. If there's already a waiting worker, prompt immediately
      if (registration.waiting) {
        showUpdatePrompt();
      }

      // 2. Listen for new workers being installed
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdatePrompt();
            }
          });
        }
      });
    }).catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}