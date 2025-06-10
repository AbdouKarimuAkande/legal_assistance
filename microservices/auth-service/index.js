import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import sgMail from '@sendgrid/mail';
// Helper function to generate CHAR ID
function generateCharId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

// MySQL connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lawhelp_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
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
    const userId = generateCharId(16);
    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, two_factor_enabled, two_factor_method, two_factor_secret)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, passwordHash, twoFactorEnabled || false, twoFactorEnabled ? twoFactorMethod : null, twoFactorSecret]
    );

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isLawyer: user.is_lawyer,
          twoFactorEnabled: user.two_factor_enabled,
          emailVerified: user.email_verified,
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Get user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      return res.json({
        success: true,
        requireTwoFactor: true,
        twoFactorMethod: user.two_factor_method,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last active
    await pool.execute(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isLawyer: user.is_lawyer,
          twoFactorEnabled: user.two_factor_enabled,
          emailVerified: user.email_verified,
        },
        token,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Missing email or code' });
    }

    // Get user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    let isValidCode = false;

    if (user.two_factor_method === '2fa_email') {
      // Verify email code
      const [codes] = await pool.execute(
        `SELECT * FROM verification_codes 
         WHERE user_id = ? AND type = '2fa_email' AND code = ? AND used = FALSE AND expires_at > NOW()`,
        [user.id, code]
      );

      if (codes.length > 0) {
        isValidCode = true;
        // Mark code as used
        await pool.execute(
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
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last active
    await pool.execute(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isLawyer: user.is_lawyer,
          twoFactorEnabled: user.two_factor_enabled,
          emailVerified: user.email_verified,
        },
        token,
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth service running on port ${PORT}`);
});