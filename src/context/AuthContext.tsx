import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { AuthService } from '../services/authService';

export interface User {
  id: string;
  name: string;
  email: string;
  isLawyer: boolean;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string, twoFactorEnabled?: boolean, twoFactorMethod?: '2fa_email' | '2fa_totp') => Promise<any>;
  verifyTwoFactor: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authService = new AuthService();

  useEffect(() => {
    // Check for existing session on app load
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        const token = localStorage.getItem('authToken');

        if (savedUser && token) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);

      if (response.requireTwoFactor) {
        return { requireTwoFactor: true, twoFactorMethod: response.twoFactorMethod };
      }

      if (response.user && response.token) {
        setUser(response.user);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('authToken', response.token);
        return { success: true, data: response };
      }

      throw new Error('Login failed');
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    twoFactorEnabled: boolean = false,
    twoFactorMethod: '2fa_email' | '2fa_totp' = '2fa_email'
  ) => {
    setIsLoading(true);
    try {
      const response = await authService.register(name, email, password, twoFactorEnabled, twoFactorMethod);

      if (response.user) {
        // Don't auto-login, require email verification
        return { success: true, data: response, qrCodeUrl: response.qrCodeUrl };
      }

      throw new Error('Registration failed');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async (email: string, code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authService.verifyTwoFactor(email, code);

      if (response.user && response.token) {
        setUser(response.user);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('authToken', response.token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    verifyTwoFactor,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};