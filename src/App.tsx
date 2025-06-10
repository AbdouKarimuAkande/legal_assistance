
import React, { useEffect, useState } from 'react';
import MainApp from './components/layout/MainApp';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  console.log('App component mounted successfully');
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <AppContent />
          </div>
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
          'VITE_SUPABASE_URL',
          'VITE_SUPABASE_ANON_KEY'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
        
        if (missingVars.length > 0) {
          setError(`Missing environment variables: ${missingVars.join(', ')}`);
          return;
        }

        // Test database connection
        console.log('Testing database connection...');
        const { DatabaseService } = await import('./services/database');
        const isConnected = await DatabaseService.testConnection();
        
        if (!isConnected) {
          setError('Failed to connect to database. Please check your MySQL configuration.');
          return;
        }

        // Initialize tables check
        await DatabaseService.initializeTables();
        
        console.log('App initialized successfully');
        setIsLoading(false);
      } catch (err) {
        console.error('App initialization error:', err);
        setError('Failed to initialize application: ' + (err as Error).message);
      }
    };

    const timer = setTimeout(initializeApp, 500);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Application Error</div>
          <div className="text-gray-600 dark:text-gray-400">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-pulse flex space-x-2 justify-center mb-4">
            <div className="h-3 w-3 bg-primary rounded-full"></div>
            <div className="h-3 w-3 bg-primary rounded-full"></div>
            <div className="h-3 w-3 bg-primary rounded-full"></div>
          </div>
          <div className="text-gray-600 dark:text-gray-400">Loading LawHelp...</div>
        </div>
      </div>
    );
  }

  try {
    return <MainApp />;
  } catch (error) {
    console.error('Error rendering MainApp:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Component Error</div>
          <div className="text-gray-600 dark:text-gray-400">Failed to render main application</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

export default App;
