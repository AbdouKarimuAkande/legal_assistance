import { pool } from '../lib/mysql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { generateCharId } from '../lib/mysql';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Initialize SendGrid

export interface AuthResponse {
  user?: any;
  token?: string;
  requireTwoFactor?: boolean;
  twoFactorMethod?: string;
  qrCodeUrl?: string;
}

export class AuthService {
  private jwtSecret = import.meta.env.VITE_JWT_SECRET || 'default-secret';

  async register(
    name: string,
    email: string,
    password: string,
    twoFactorEnabled: boolean = false,
    twoFactorMethod: '2fa_email' | '2fa_totp' = '2fa_email'
  ): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const [existingUsers] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate TOTP secret if needed
      let twoFactorSecret = null;
      let qrCodeUrl = null;

      if (twoFactorEnabled && twoFactorMethod === '2fa_totp') {
        twoFactorSecret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(email, 'LawHelp', twoFactorSecret);
        qrCodeUrl = await QRCode.toDataURL(otpauth);
      }

      // Create user
      const userId = generateCharId(16);
      await pool.execute<ResultSetHeader>(
        `INSERT INTO users (id, name, email, password_hash, two_factor_enabled, two_factor_method, two_factor_secret)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, email, passwordHash, twoFactorEnabled, twoFactorEnabled ? twoFactorMethod : null, twoFactorSecret]
      );

      const [users] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      const user = users[0];

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
      const [users] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = users[0];

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
      await pool.execute<ResultSetHeader>(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
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
      const [users] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      let isValidCode = false;

      if (user.two_factor_method === '2fa_email') {
        // Verify email code
        const [codes] = await pool.execute<RowDataPacket[]>(
          `SELECT * FROM verification_codes 
           WHERE user_id = ? AND type = '2fa_email' AND code = ? AND used = FALSE AND expires_at > NOW()`,
          [user.id, code]
        );

        if (codes.length > 0) {
          isValidCode = true;
          // Mark code as used
          await pool.execute<ResultSetHeader>(
            'UPDATE verification_codes SET used = TRUE WHERE id = ?',
            [codes[0].id]
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
      await pool.execute<ResultSetHeader>(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
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
    await pool.execute<ResultSetHeader>(
      `INSERT INTO verification_codes (id, user_id, code, type, expires_at)
       VALUES (?, ?, ?, 'email_verification', ?)`,
      [uuidv4(), userId, code, expiresAt]
    );

    // Send email
    const msg = {
      to: email,
      from: import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'noreply@lawhelp.cm',
      subject: 'Verify your email - LawHelp',
      html: `
        <h2>Welcome to LawHelp!</h2>
        <p>Please verify your email address using the code below:</p>
        <h3 style="background: #f0f0f0; padding: 10px; text-align: center;">${code}</h3>
        <p>This code expires in 15 minutes.</p>
      `,
    };

    
  }

  async send2FAEmail(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store verification code
    await pool.execute<ResultSetHeader>(
      `INSERT INTO verification_codes (id, user_id, code, type, expires_at)
       VALUES (?, ?, ?, '2fa_email', ?)`,
      [uuidv4(), userId, code, expiresAt]
    );

    // Send email
    const msg = {
      to: email,
      from: import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'noreply@lawhelp.cm',
      subject: 'Two-Factor Authentication Code - LawHelp',
      html: `
        <h2>Two-Factor Authentication</h2>
        <p>Your verification code is:</p>
        <h3 style="background: #f0f0f0; padding: 10px; text-align: center;">${code}</h3>
        <p>This code expires in 5 minutes.</p>
      `,
    };

    
  }

  async logout(): Promise<void> {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just clear it on the client side
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
}