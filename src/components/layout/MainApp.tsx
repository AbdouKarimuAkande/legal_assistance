The code has been modified to include the HistoryScreen component in the MainApp and render it based on the active tab.
```
```replit_final_file>
import React, { useState } from 'react';
import Navbar from './Navbar';
import ChatScreen from '../chat/ChatScreen';
import LawyerDirectoryScreen from '../lawyers/LawyerDirectoryScreen';
import LawyerRegistrationScreen from '../lawyers/LawyerRegistrationScreen';
import HistoryScreen from '../chat/HistoryScreen';

type Screen = 'chat' | 'lawyers' | 'lawyer-registration' | 'history';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'lawyers' | 'profile' | 'history'>('chat');
  const [showLawyerRegistration, setShowLawyerRegistration] = useState(false);

  const handleBecomeLawyer = () => {
    setShowLawyerRegistration(true);
  };

  const handleBackToDirectory = () => {
    setShowLawyerRegistration(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="pt-16">
        {activeTab === 'chat' && <ChatScreen />}
        {activeTab === 'lawyers' && !showLawyerRegistration && (
          <LawyerDirectoryScreen onBecomeLawyer={handleBecomeLawyer} />
        )}
        {activeTab === 'lawyers' && showLawyerRegistration && (
          <div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <button
                onClick={handleBackToDirectory}
                className="flex items-center text-primary hover:text-primary-dark mb-4"
              >
                ← Back to Directory
              </button>
            </div>
            <LawyerRegistrationScreen />
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Profile Settings
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Welcome, {user?.name}!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Email: {user?.email}
              </p>
            </div>
          </div>
        )}
        {activeTab === 'history' && <HistoryScreen />}
      </div>
    </div>
  );
};

export default MainApp;