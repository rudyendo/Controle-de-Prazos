
import React from 'react';
import ReactDOM from 'react-dom/client';

// Shim para compatibilidade de bibliotecas que dependem de process.env no browser
// IMPORTANTE: Deve vir antes de importar o App para que o geminiService já encontre o process.env definido
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || {};
  (window as any).process.env = (window as any).process.env || {};
}

import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Elemento root não encontrado.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
