
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<string>('');
  const [pendingEmail, setPendingEmail] = useState('');
  const { login, verifyTwoFactor, isLoading } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await login(email, password);
      
      if (response.requireTwoFactor) {
        setShowTwoFactorInput(true);
        setTwoFactorMethod(response.twoFactorMethod);
        setPendingEmail(email);
        
        if (response.twoFactorMethod === '2fa_email') {
          setError('A verification code has been sent to your email.');
        } else {
          setError('Please enter the code from your authenticator app.');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
    }
  };

  const handleTwoFactorVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      const success = await verifyTwoFactor(pendingEmail, verificationCode);
      if (!success) {
        setError('Invalid verification code');
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
    }
  };

  if (showTwoFactorInput) {
    return (
      <form onSubmit={handleTwoFactorVerification} className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {twoFactorMethod === '2fa_email' 
              ? 'Enter the 6-digit code sent to your email'
              : 'Enter the code from your authenticator app'
            }
          </p>
        </div>

        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Verification Code
          </label>
          <input
            type="text"
            id="verification-code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="input-field text-center text-lg tracking-widest"
            placeholder="000000"
            maxLength={6}
            pattern="\d{6}"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !verificationCode}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowTwoFactorInput(false);
            setVerificationCode('');
            setError('');
          }}
          className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Back to login
        </button>

        {error && (
          <div className={`text-sm text-center ${
            error.includes('sent to your email') ? 'text-green-600' : 'text-red-500'
          }`}>
            {error}
          </div>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          placeholder="Enter your email"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          placeholder="Enter your password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      {error && !error.includes('sent to your email') && (
        <div className="text-red-500 text-sm text-center">{error}</div>
      )}
    </form>
  );
};

export default LoginForm;
