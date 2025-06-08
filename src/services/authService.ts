
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';

// Initialize SendGrid
sgMail.setApiKey(import.meta.env.VITE_SENDGRID_API_KEY || '');

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
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
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
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          name,
          email,
          password_hash: passwordHash,
          two_factor_enabled: twoFactorEnabled,
          two_factor_method: twoFactorEnabled ? twoFactorMethod : null,
          two_factor_secret: twoFactorSecret,
        })
        .select()
        .single();

      if (error) throw error;

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
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new Error('Invalid credentials');
      }

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
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id);

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
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      let isValidCode = false;

      if (user.two_factor_method === '2fa_email') {
        // Verify email code
        const { data: verificationCode } = await supabase
          .from('verification_codes')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', '2fa_email')
          .eq('code', code)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (verificationCode) {
          isValidCode = true;
          // Mark code as used
          await supabase
            .from('verification_codes')
            .update({ used: true })
            .eq('id', verificationCode.id);
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
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id);

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
    await supabase
      .from('verification_codes')
      .insert({
        user_id: userId,
        code,
        type: 'email_verification',
        expires_at: expiresAt.toISOString(),
      });

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

    await sgMail.send(msg);
  }

  async send2FAEmail(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store verification code
    await supabase
      .from('verification_codes')
      .insert({
        user_id: userId,
        code,
        type: '2fa_email',
        expires_at: expiresAt.toISOString(),
      });

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

    await sgMail.send(msg);
  }

  async logout(): Promise<void> {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just clear it on the client side
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
}
