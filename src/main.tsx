
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
console.log('Environment:', import.meta.env.MODE);
console.log('Base URL:', import.meta.env.BASE_URL);

// Add error boundary at the top level
const AppWithErrorHandling = () => {
  try {
    return (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('App rendering error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Application Error</h1>
        <p>Error: {(error as Error).message}</p>
        <pre>{(error as Error).stack}</pre>
      </div>
    );
  }
};

const root = createRoot(rootElement);
root.render(<AppWithErrorHandling />);

// Log when React has finished rendering
console.log('React root created and render initiated');
