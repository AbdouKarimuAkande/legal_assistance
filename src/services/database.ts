
import { pool } from '../lib/mysql';

export class DatabaseService {
  static async testConnection(): Promise<boolean> {
    try {
      const [rows] = await pool.execute('SELECT 1 as test');
      console.log('Database connection successful');
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  static async initializeTables(): Promise<void> {
    try {
      // Create users table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id CHAR(16) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_lawyer BOOLEAN DEFAULT FALSE,
          two_factor_enabled BOOLEAN DEFAULT FALSE,
          two_factor_method ENUM('2fa_email', '2fa_totp') DEFAULT NULL,
          two_factor_secret VARCHAR(255) DEFAULT NULL,
          phone VARCHAR(20) DEFAULT NULL,
          email_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          last_active TIMESTAMP NULL
        )
      `);

      // Create chat_sessions table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id CHAR(16) PRIMARY KEY,
          user_id CHAR(16) NOT NULL,
          title VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create chat_messages table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id CHAR(16) PRIMARY KEY,
          session_id CHAR(16) NOT NULL,
          user_id CHAR(16) NOT NULL,
          message TEXT NOT NULL,
          sender ENUM('user', 'bot') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create verification_codes table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS verification_codes (
          id CHAR(16) PRIMARY KEY,
          user_id CHAR(16) NOT NULL,
          code VARCHAR(10) NOT NULL,
          type ENUM('email_verification', '2fa_email', 'password_reset') NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }

  static async getUserById(userId: string) {
    try {
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      return (users as any[]).length > 0 ? (users as any[])[0] : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  static async getUserByEmail(email: string) {
    try {
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      return (users as any[]).length > 0 ? (users as any[])[0] : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, updates: any) {
    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      await pool.execute(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        [...values, userId]
      );
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}
