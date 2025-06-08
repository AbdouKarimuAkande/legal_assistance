import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    // Check for existing user session
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // First try Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw new Error(authError.message);
      }

      if (authData.user) {
        // Get user profile from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (userError) {
          console.error('User data error:', userError);
          // If user doesn't exist in our table, create them
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email || email,
              name: authData.user.user_metadata?.name || email.split('@')[0],
              password_hash: '', // This will be handled by Supabase auth
              email_verified: authData.user.email_confirmed_at ? true : false,
            })
            .select()
            .single();

          if (createError) {
            console.error('Create user error:', createError);
            throw new Error('Failed to create user profile');
          }
          userData = newUser;
        }

        const user: User = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          isLawyer: userData.is_lawyer || false,
          twoFactorEnabled: userData.two_factor_enabled || false,
          emailVerified: userData.email_verified || false,
        };

        setUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', authData.session?.access_token || '');

        return { success: true, data: { user } };
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
      // Register with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (authError) {
        console.error('Supabase registration error:', authError);
        throw new Error(authError.message);
      }

      if (authData.user) {
        // Create user profile in our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            name: name,
            password_hash: '', // Handled by Supabase auth
            two_factor_enabled: twoFactorEnabled,
            two_factor_method: twoFactorEnabled ? twoFactorMethod : null,
            email_verified: false,
          })
          .select()
          .single();

        if (userError) {
          console.error('User creation error:', userError);
          throw new Error('Failed to create user profile');
        }

        const user: User = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          isLawyer: userData.is_lawyer || false,
          twoFactorEnabled: userData.two_factor_enabled || false,
          emailVerified: userData.email_verified || false,
        };

        setUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));

        return { success: true, data: { user } };
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
      const response = await apiService.verifyTwoFactor(email, code);

      if (response.data?.user && response.data?.token) {
        setUser(response.data.user);
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        localStorage.setItem('authToken', response.data.token);
        return true;
      }

      return false;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the user even if the API fails
      setUser(null);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      verifyTwoFactor,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};