import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainApp from './components/layout/MainApp';
import { ErrorBoundary } from './components/ErrorBoundary';

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
    // Initialize app with detailed error handling
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        console.log('Environment variables:', {
          VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
          VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
          MODE: import.meta.env.MODE,
          DEV: import.meta.env.DEV
        });
        
        // Test basic functionality
        console.log('Testing localStorage...');
        localStorage.setItem('test', 'working');
        localStorage.removeItem('test');
        
        console.log('App initialized successfully');
        setIsLoading(false);
      } catch (err) {
        console.error('App initialization error:', err);
        console.error('Error stack:', (err as Error).stack);
        setError('Failed to initialize application: ' + (err as Error).message);
      }
    };

    // Add global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      setError('Runtime error: ' + event.error?.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError('Promise rejection: ' + event.reason);
    });

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