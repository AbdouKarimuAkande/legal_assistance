// Browser-compatible authentication service
export interface AuthResponse {
  user?: any;
  token?: string;
  requireTwoFactor?: boolean;
  twoFactorMethod?: string;
  qrCodeUrl?: string;
}

export class AuthService {
  private apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://0.0.0.0:3000/api';

  async register(
    name: string,
    email: string,
    password: string,
    twoFactorEnabled: boolean = false,
    twoFactorMethod: '2fa_email' | '2fa_totp' = '2fa_email'
  ): Promise<AuthResponse> {
    try {
      console.log('Attempting registration...');

      // For now, return mock response since backend is not connected
      return {
        user: {
          id: 'mock-user-id',
          name,
          email,
          isLawyer: false,
          twoFactorEnabled,
          emailVerified: false,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Registration service not available');
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('Attempting login...');

      // Demo credentials check
      if (email === 'abdou@gmail.com' && password === 'abdou1') {
        return {
          user: {
            id: 'demo-user-id',
            name: 'Demo User',
            email,
            isLawyer: false,
            twoFactorEnabled: false,
            emailVerified: true,
          },
          token: 'demo-jwt-token',
        };
      }

      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async verifyTwoFactor(email: string, code: string): Promise<AuthResponse> {
    try {
      console.log('Verifying 2FA...');

      // Mock 2FA verification
      if (code === '123456') {
        return {
          user: {
            id: 'demo-user-id',
            name: 'Demo User',
            email,
            isLawyer: false,
            twoFactorEnabled: true,
            emailVerified: true,
          },
          token: 'demo-jwt-token',
        };
      }

      throw new Error('Invalid verification code');
    } catch (error) {
      console.error('2FA verification error:', error);
      throw error;
    }
  }

  async sendEmailVerification(userId: string, email: string): Promise<void> {
    console.log('Email verification code: 123456');
  }

  async send2FAEmail(userId: string, email: string): Promise<void> {
    console.log('2FA verification code: 123456');
  }

  async logout(): Promise<void> {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
}