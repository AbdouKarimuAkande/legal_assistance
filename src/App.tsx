import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainApp from './components/layout/MainApp';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for required environment variables and test database connection
    const initializeApp = async () => {
      try {
        // Check if required environment variables are set
        const requiredEnvVars = [
          'DB_HOST',
          'DB_USER',
          'DB_PASSWORD',
          'DB_NAME'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
          console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
          // Continue with defaults for development
        }

        // Test database connection
        console.log('Testing database connection...');
        const { DatabaseService } = await import('./services/database');
        const isConnected = await DatabaseService.testConnection();

        if (!isConnected) {
          setError('Failed to connect to database. Please check your MySQL configuration.');
          return;
        }

        // Initialize tables
        await DatabaseService.initializeTables();

        console.log('App initialized successfully');
        setIsLoading(false);
      } catch (err) {
        console.error('App initialization error:', err);
        setError('Failed to initialize application: ' + (err as Error).message);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="font-bold mb-2">Initialization Error</h2>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <MainApp />;
}

export default App;