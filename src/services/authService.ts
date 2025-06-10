
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { pool, generateCharId } from '../lib/mysql';

export interface AuthResponse {
  user?: any;
  token?: string;
  requireTwoFactor?: boolean;
  twoFactorMethod?: string;
  qrCodeUrl?: string;
}

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || 'default-secret';

  async register(
    name: string,
    email: string,
    password: string,
    twoFactorEnabled: boolean = false,
    twoFactorMethod: '2fa_email' | '2fa_totp' = '2fa_email'
  ): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if ((existingUsers as any[]).length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate TOTP secret if needed
      let twoFactorSecret = null;
      let qrCodeUrl: string | undefined = undefined;

      if (twoFactorEnabled && twoFactorMethod === '2fa_totp') {
        twoFactorSecret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(email, 'LawHelp', twoFactorSecret);
        qrCodeUrl = await QRCode.toDataURL(otpauth);
      }

      // Create user
      const userId = generateCharId();
      await pool.execute(
        `INSERT INTO users (id, name, email, password_hash, two_factor_enabled, two_factor_method, two_factor_secret) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          name,
          email,
          passwordHash,
          twoFactorEnabled,
          twoFactorEnabled ? twoFactorMethod : null,
          twoFactorSecret
        ]
      );

      // Get created user
      const [userData] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      const user = (userData as any[])[0];

      // Send email verification
      await this.sendEmailVerification(user.id, email);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isLawyer: user.is_lawyer,
          twoFactorEnabled: user.two_factor_enabled,
          emailVerified: user.email_verified,
        },
        qrCodeUrl,
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Get user
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

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        if (user.two_factor_method === '2fa_email') {
          await this.send2FAEmail(user.id, email);
        }

        return {
          requireTwoFactor: true,
          twoFactorMethod: user.two_factor_method,
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      // Update last active
      await pool.execute(
        'UPDATE users SET last_active = NOW() WHERE id = ?',
        [user.id]
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
        token,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async verifyTwoFactor(email: string, code: string): Promise<AuthResponse> {
    try {
      // Get user
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if ((users as any[]).length === 0) {
        throw new Error('User not found');
      }

      const user = (users as any[])[0];
      let isValidCode = false;

      if (user.two_factor_method === '2fa_email') {
        // Verify email code
        const [codes] = await pool.execute(
          `SELECT * FROM verification_codes 
           WHERE user_id = ? AND type = ? AND code = ? AND used = FALSE AND expires_at > NOW()`,
          [user.id, '2fa_email', code]
        );

        if ((codes as any[]).length > 0) {
          isValidCode = true;
          // Mark code as used
          await pool.execute(
            'UPDATE verification_codes SET used = TRUE WHERE id = ?',
            [(codes as any[])[0].id]
          );
        }
      } else if (user.two_factor_method === '2fa_totp') {
        // Verify TOTP code
        isValidCode = authenticator.verify({
          token: code,
          secret: user.two_factor_secret,
        });
      }

      if (!isValidCode) {
        throw new Error('Invalid verification code');
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      // Update last active
      await pool.execute(
        'UPDATE users SET last_active = NOW() WHERE id = ?',
        [user.id]
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
        token,
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      throw error;
    }
  }

  async sendEmailVerification(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code
    await pool.execute(
      `INSERT INTO verification_codes (id, user_id, code, type, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [generateCharId(), userId, code, 'email_verification', expiresAt]
    );

    // In a real implementation, you would send the email through the backend
    console.log('Email verification code:', code);
  }

  async send2FAEmail(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store verification code
    await pool.execute(
      `INSERT INTO verification_codes (id, user_id, code, type, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [generateCharId(), userId, code, '2fa_email', expiresAt]
    );

    // In a real implementation, you would send the email through the backend
    console.log('2FA verification code:', code);
  }

  async logout(): Promise<void> {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just clear it on the client side
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
}
