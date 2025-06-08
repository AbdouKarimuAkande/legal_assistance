
import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">LawHelp</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Cameroon Legal Assistant Platform
          </p>
        </div>

        <div className="card">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-l-lg transition-colors ${
                isLogin
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-r-lg transition-colors ${
                !isLogin
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Register
            </button>
          </div>

          {isLogin ? <LoginForm /> : <RegisterForm />}
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Demo credentials:</p>
          <p>Email: abdou@gmail.com</p>
          <p>Password: abdou1</p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
