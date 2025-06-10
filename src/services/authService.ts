
import { pool, generateCharId } from '../lib/mysql';
import bcrypt from 'bcryptjs';

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

      // Check if user already exists
      const [existingUsers] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if ((existingUsers as any[]).length > 0) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = generateCharId();

      // Insert new user
      await pool.execute(
        `INSERT INTO users (
          id, email, name, password_hash, is_lawyer, 
          two_factor_enabled, two_factor_method, email_verified,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          email,
          name,
          passwordHash,
          false,
          twoFactorEnabled,
          twoFactorEnabled ? twoFactorMethod : null,
          false
        ]
      );

      // Fetch the created user
      const [users] = await pool.execute(
        'SELECT id, name, email, is_lawyer, two_factor_enabled, email_verified FROM users WHERE id = ?',
        [userId]
      );

      const user = (users as any[])[0];

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isLawyer: user.is_lawyer,
          twoFactorEnabled: user.two_factor_enabled,
          emailVerified: user.email_verified,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('Attempting login...');

      // Fetch user from database
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if ((users as any[]).length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = (users as any[])[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last active
      await pool.execute(
        'UPDATE users SET last_active = NOW() WHERE id = ?',
        [user.id]
      );

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        // Send 2FA code if email method
        if (user.two_factor_method === '2fa_email') {
          await this.send2FAEmail(user.id, user.email);
        }

        return {
          requireTwoFactor: true,
          twoFactorMethod: user.two_factor_method,
        };
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isLawyer: user.is_lawyer,
          twoFactorEnabled: user.two_factor_enabled,
          emailVerified: user.email_verified,
        },
        token: 'jwt-token-' + user.id,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async verifyTwoFactor(email: string, code: string): Promise<AuthResponse> {
    try {
      console.log('Verifying 2FA...');

      // Fetch user
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if ((users as any[]).length === 0) {
        throw new Error('User not found');
      }

      const user = (users as any[])[0];

      // Check verification code
      const [codes] = await pool.execute(
        'SELECT * FROM verification_codes WHERE user_id = ? AND code = ? AND type = ? AND used = FALSE AND expires_at > NOW()',
        [user.id, code, '2fa_email']
      );

      if ((codes as any[]).length === 0) {
        throw new Error('Invalid or expired verification code');
      }

      // Mark code as used
      await pool.execute(
        'UPDATE verification_codes SET used = TRUE WHERE id = ?',
        [(codes as any[])[0].id]
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isLawyer: user.is_lawyer,
          twoFactorEnabled: user.two_factor_enabled,
          emailVerified: user.email_verified,
        },
        token: 'jwt-token-' + user.id,
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      throw error;
    }
  }

  async sendEmailVerification(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = generateCharId();

    await pool.execute(
      `INSERT INTO verification_codes (id, user_id, code, type, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW())`,
      [codeId, userId, code, 'email_verification']
    );

    console.log(`Email verification code for ${email}: ${code}`);
  }

  async send2FAEmail(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = generateCharId();

    await pool.execute(
      `INSERT INTO verification_codes (id, user_id, code, type, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())`,
      [codeId, userId, code, '2fa_email']
    );

    console.log(`2FA verification code for ${email}: ${code}`);
  }

  async logout(): Promise<void> {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
}
