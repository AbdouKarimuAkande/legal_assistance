
import { pool } from '../lib/mysql';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class DatabaseService {
  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('Database connection successful');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // Initialize database tables if they don't exist
  static async initializeTables(): Promise<void> {
    try {
      const connection = await pool.getConnection();
      
      // Create users table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_lawyer BOOLEAN DEFAULT FALSE,
          two_factor_enabled BOOLEAN DEFAULT FALSE,
          two_factor_method ENUM('2fa_email', '2fa_totp') NULL,
          two_factor_secret VARCHAR(255) NULL,
          phone VARCHAR(20) NULL,
          email_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          last_active TIMESTAMP NULL
        )
      `);

      // Create chat_sessions table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          user_id VARCHAR(36) NOT NULL,
          title VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create chat_messages table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          session_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          message TEXT NOT NULL,
          sender ENUM('user', 'bot') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create verification_codes table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS verification_codes (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          user_id VARCHAR(36) NOT NULL,
          code VARCHAR(10) NOT NULL,
          type ENUM('email_verification', '2fa_email', 'password_reset') NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      connection.release();
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing tables:', error);
      throw error;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string) {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Create or update user
  static async upsertUser(userData: any) {
    try {
      const { id, email, name, password_hash, is_lawyer, two_factor_enabled, two_factor_method, two_factor_secret, phone, email_verified } = userData;
      
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users (id, email, name, password_hash, is_lawyer, two_factor_enabled, two_factor_method, two_factor_secret, phone, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         is_lawyer = VALUES(is_lawyer),
         two_factor_enabled = VALUES(two_factor_enabled),
         two_factor_method = VALUES(two_factor_method),
         two_factor_secret = VALUES(two_factor_secret),
         phone = VALUES(phone),
         email_verified = VALUES(email_verified),
         updated_at = CURRENT_TIMESTAMP`,
        [id, email, name, password_hash, is_lawyer || false, two_factor_enabled || false, two_factor_method, two_factor_secret, phone, email_verified || false]
      );

      if (result.insertId) {
        return await this.getUserByEmail(email);
      } else {
        return await this.getUserByEmail(email);
      }
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }
}

export default DatabaseService;
