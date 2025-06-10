
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Set page title
document.title = 'LawHelp - Cameroon Legal Assistant';

// Get root element with error handling
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id="root" in your HTML.');
}

console.log('Starting React application...');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
