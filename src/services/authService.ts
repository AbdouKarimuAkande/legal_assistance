import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

// Initialize SendGrid

export interface AuthResponse {
  user?: any;
  token?: string;
  requireTwoFactor?: boolean;
  twoFactorMethod?: string;
  qrCodeUrl?: string;
}

export class AuthService {
  private jwtSecret = (import.meta as any).env.VITE_JWT_SECRET || 'default-secret';

  async register(
    name: string,
    email: string,
    password: string,
    twoFactorEnabled: boolean = false,
    twoFactorMethod: '2fa_email' | '2fa_totp' = '2fa_email'
  ): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email);

      if (checkError) throw checkError;
      if (existingUsers && existingUsers.length > 0) {
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
      const userId = uuidv4();
      const { data: userData, error: insertError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          name,
          email,
          password_hash: passwordHash,
          two_factor_enabled: twoFactorEnabled,
          two_factor_method: twoFactorEnabled ? twoFactorMethod : null,
          two_factor_secret: twoFactorSecret
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Send email verification
      await this.sendEmailVerification(userData.id, email);

      return {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          isLawyer: userData.is_lawyer,
          twoFactorEnabled: userData.two_factor_enabled,
          emailVerified: userData.email_verified,
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
      const { data: users, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

      if (selectError) throw selectError;
      if (!users || users.length === 0) {
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
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) console.error('Failed to update last active:', updateError);

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
      const { data: users, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

      if (selectError) throw selectError;
      if (!users || users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      let isValidCode = false;

      if (user.two_factor_method === '2fa_email') {
        // Verify email code
        const { data: codes, error: codeError } = await supabase
          .from('verification_codes')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', '2fa_email')
          .eq('code', code)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString());

        if (codeError) throw codeError;

        if (codes && codes.length > 0) {
          isValidCode = true;
          // Mark code as used
          const { error: updateError } = await supabase
            .from('verification_codes')
            .update({ used: true })
            .eq('id', codes[0].id);

          if (updateError) throw updateError;
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
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) console.error('Failed to update last active:', updateError);

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
    const { error } = await supabase
      .from('verification_codes')
      .insert([{
        id: uuidv4(),
        user_id: userId,
        code,
        type: 'email_verification',
        expires_at: expiresAt.toISOString()
      }]);

    if (error) throw error;

    // In a real implementation, you would send the email through the backend
    console.log('Email verification code:', code);
  }

  async send2FAEmail(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store verification code
    const { error } = await supabase
      .from('verification_codes')
      .insert([{
        id: uuidv4(),
        user_id: userId,
        code,
        type: '2fa_email',
        expires_at: expiresAt.toISOString()
      }]);

    if (error) throw error;

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