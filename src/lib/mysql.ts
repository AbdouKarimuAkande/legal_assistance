
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lawhelp_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);

// Database Types
export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  is_lawyer: boolean;
  two_factor_enabled: boolean;
  two_factor_method: '2fa_email' | '2fa_totp' | null;
  two_factor_secret: string | null;
  phone: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_active: string | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  sender: 'user' | 'bot';
  created_at: string;
}

export interface VerificationCode {
  id: string;
  user_id: string;
  code: string;
  type: 'email_verification' | '2fa_email' | 'password_reset';
  expires_at: string;
  used: boolean;
  created_at: string;
}
