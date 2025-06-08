
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import sgMail from '@sendgrid/mail';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, twoFactorEnabled, twoFactorMethod } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate TOTP secret if needed
    let twoFactorSecret = null;
    if (twoFactorEnabled && twoFactorMethod === '2fa_totp') {
      twoFactorSecret = authenticator.generateSecret();
    }

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        two_factor_enabled: twoFactorEnabled || false,
        two_factor_method: twoFactorEnabled ? twoFactorMethod : null,
        two_factor_secret: twoFactorSecret,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isLawyer: user.is_lawyer,
        twoFactorEnabled: user.two_factor_enabled,
      },
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check 2FA
    if (user.two_factor_enabled) {
      return res.json({
        requireTwoFactor: true,
        twoFactorMethod: user.two_factor_method,
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isLawyer: user.is_lawyer,
        twoFactorEnabled: user.two_factor_enabled,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Missing email or code' });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
        await supabase
          .from('verification_codes')
          .update({ used: true })
          .eq('id', verificationCode.id);
      }
    } else if (user.two_factor_method === '2fa_totp') {
      isValidCode = authenticator.verify({
        token: code,
        secret: user.two_factor_secret,
      });
    }

    if (!isValidCode) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isLawyer: user.is_lawyer,
        twoFactorEnabled: user.two_factor_enabled,
      },
      token,
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth service running on port ${PORT}`);
});
