
import React from 'react';
import { Sun, Moon, LogOut, User, MessageSquare, History, Users, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentScreen, setCurrentScreen }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-primary">LawHelp</h1>
          <div className="hidden md:flex space-x-1">
            <button
              onClick={() => setCurrentScreen('chat')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                currentScreen === 'chat'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <MessageSquare size={18} />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setCurrentScreen('lawyers')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                currentScreen === 'lawyers'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Users size={18} />
              <span>Lawyers</span>
            </button>
            <button
              onClick={() => setCurrentScreen('history')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                currentScreen === 'history'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <History size={18} />
              <span>History</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button
            onClick={() => setCurrentScreen('profile')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              currentScreen === 'profile'
                ? 'bg-primary text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <User size={18} />
            <span className="hidden sm:inline">{user?.name}</span>
          </button>

          <button
            onClick={logout}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
