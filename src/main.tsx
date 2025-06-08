
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Add marked script to head safely
try {
  const markedScript = document.createElement('script');
  markedScript.src = 'https://unpkg.com/marked@4.3.0/marked.min.js';
  markedScript.onload = () => {
    console.log('Marked.js loaded successfully');
  };
  markedScript.onerror = () => {
    console.warn('Failed to load Marked.js, using fallback');
  };
  document.head.appendChild(markedScript);
} catch (error) {
  console.warn('Could not load external scripts:', error);
}

// Set page title
document.title = 'LawHelp - Cameroon Legal Assistant Copy';

// Get root element with error handling
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id="root" in your HTML.');
}

console.log('App component is rendering');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
