
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import ChatScreen from '../chat/ChatScreen';
import AuthScreen from '../auth/AuthScreen';

type Screen = 'chat' | 'history' | 'profile' | 'lawyers';

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('chat');

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'chat':
        return <ChatScreen />;
      case 'history':
        return <div className="p-4 text-center">History Screen - Coming Soon</div>;
      case 'profile':
        return <div className="p-4 text-center">Profile Screen - Coming Soon</div>;
      case 'lawyers':
        return <div className="p-4 text-center">Lawyers Directory - Coming Soon</div>;
      default:
        return <ChatScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
      <main>{renderScreen()}</main>
    </div>
  );
};

export default MainApp;
