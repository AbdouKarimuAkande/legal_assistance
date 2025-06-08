
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    twoFactorMethod: '2fa_email' as '2fa_email' | '2fa_totp'
  });
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const { register, isLoading } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      const response = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.twoFactorEnabled,
        formData.twoFactorMethod
      );

      if (response.qrCodeUrl) {
        setQrCodeUrl(response.qrCodeUrl);
      }
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    }
  };

  if (qrCodeUrl) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Set Up Authenticator App
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>
        <div className="flex justify-center">
          <img src={qrCodeUrl} alt="QR Code for 2FA setup" className="border rounded" />
        </div>
        <p className="text-sm text-green-600">
          Registration successful! Please verify your email to complete setup.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="input-field"
          placeholder="Enter your full name"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
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
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="input-field"
          placeholder="Enter your password"
          required
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="input-field"
          placeholder="Confirm your password"
          required
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="twoFactorEnabled"
            name="twoFactorEnabled"
            checked={formData.twoFactorEnabled}
            onChange={handleChange}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="twoFactorEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Enable Two-Factor Authentication (Recommended)
          </label>
        </div>

        {formData.twoFactorEnabled && (
          <div className="ml-6 space-y-2">
            <div className="flex items-center">
              <input
                type="radio"
                id="2fa-email"
                name="twoFactorMethod"
                value="2fa_email"
                checked={formData.twoFactorMethod === '2fa_email'}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
              />
              <label htmlFor="2fa-email" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Email Verification
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="2fa-totp"
                name="twoFactorMethod"
                value="2fa_totp"
                checked={formData.twoFactorMethod === '2fa_totp'}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
              />
              <label htmlFor="2fa-totp" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Authenticator App (More Secure)
              </label>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>

      {error && (
        <div className="text-red-500 text-sm text-center">{error}</div>
      )}
    </form>
  );
};

export default RegisterForm;
