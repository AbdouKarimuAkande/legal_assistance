
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

      // Create lawyer_profiles table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS lawyer_profiles (
          id CHAR(16) PRIMARY KEY,
          user_id CHAR(16) NOT NULL,
          license_number VARCHAR(100) NOT NULL,
          specialization VARCHAR(255) NOT NULL,
          experience_years INT DEFAULT 0,
          practice_areas JSON,
          languages JSON,
          office_address TEXT NOT NULL,
          phone VARCHAR(20),
          description TEXT,
          profile_image VARCHAR(500),
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_license (license_number),
          UNIQUE KEY unique_user (user_id)
        )
      `);

      // Create lawyer_ratings table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS lawyer_ratings (
          id CHAR(16) PRIMARY KEY,
          lawyer_id CHAR(16) NOT NULL,
          user_id CHAR(16) NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          review TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lawyer_id) REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_lawyer_rating (user_id, lawyer_id)
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

  // Lawyer Profile Methods
  static async createLawyerProfile(profileData: any) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO lawyer_profiles (
          id, user_id, license_number, specialization, experience_years,
          practice_areas, languages, office_address, phone, description,
          profile_image, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          profileData.id,
          profileData.userId,
          profileData.licenseNumber,
          profileData.specialization,
          profileData.experienceYears,
          JSON.stringify(profileData.practiceAreas),
          JSON.stringify(profileData.languages),
          profileData.officeAddress,
          profileData.phone,
          profileData.description,
          profileData.profileImage
        ]
      );
      
      return result;
    } catch (error) {
      console.error('Error creating lawyer profile:', error);
      throw error;
    }
  }

  static async getLawyerProfiles(filters?: any) {
    try {
      let query = `
        SELECT lp.*, u.name, u.email,
               COALESCE(AVG(r.rating), 0) as average_rating,
               COUNT(r.id) as review_count
        FROM lawyer_profiles lp
        JOIN users u ON lp.user_id = u.id
        LEFT JOIN lawyer_ratings r ON lp.id = r.lawyer_id
      `;
      
      const conditions = [];
      const values = [];

      if (filters?.specialization) {
        conditions.push('lp.specialization = ?');
        values.push(filters.specialization);
      }

      if (filters?.minExperience) {
        conditions.push('lp.experience_years >= ?');
        values.push(filters.minExperience);
      }

      if (filters?.search) {
        conditions.push('(u.name LIKE ? OR lp.description LIKE ? OR lp.specialization LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        values.push(searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY lp.id ORDER BY average_rating DESC, lp.created_at DESC';

      const [lawyers] = await pool.execute(query, values);
      
      return (lawyers as any[]).map(lawyer => ({
        ...lawyer,
        practice_areas: JSON.parse(lawyer.practice_areas || '[]'),
        languages: JSON.parse(lawyer.languages || '[]')
      }));
    } catch (error) {
      console.error('Error fetching lawyer profiles:', error);
      throw error;
    }
  }

  static async getLawyerProfileById(lawyerId: string) {
    try {
      const [lawyers] = await pool.execute(
        `SELECT lp.*, u.name, u.email,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(r.id) as review_count
         FROM lawyer_profiles lp
         JOIN users u ON lp.user_id = u.id
         LEFT JOIN lawyer_ratings r ON lp.id = r.lawyer_id
         WHERE lp.id = ?
         GROUP BY lp.id`,
        [lawyerId]
      );
      
      const lawyer = (lawyers as any[])[0];
      if (lawyer) {
        lawyer.practice_areas = JSON.parse(lawyer.practice_areas || '[]');
        lawyer.languages = JSON.parse(lawyer.languages || '[]');
      }
      
      return lawyer || null;
    } catch (error) {
      console.error('Error fetching lawyer profile:', error);
      throw error;
    }
  }

  // Rating Methods
  static async createLawyerRating(ratingData: any) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO lawyer_ratings (id, lawyer_id, user_id, rating, review, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          ratingData.id,
          ratingData.lawyerId,
          ratingData.userId,
          ratingData.rating,
          ratingData.review
        ]
      );
      
      return result;
    } catch (error) {
      console.error('Error creating lawyer rating:', error);
      throw error;
    }
  }

  static async getLawyerRatings(lawyerId: string) {
    try {
      const [ratings] = await pool.execute(
        `SELECT r.*, u.name as user_name
         FROM lawyer_ratings r
         JOIN users u ON r.user_id = u.id
         WHERE r.lawyer_id = ?
         ORDER BY r.created_at DESC`,
        [lawyerId]
      );
      
      return ratings as any[];
    } catch (error) {
      console.error('Error fetching lawyer ratings:', error);
      throw error;
    }
  }

  static async updateLawyerProfile(lawyerId: string, updates: any) {
    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      await pool.execute(
        `UPDATE lawyer_profiles SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, lawyerId]
      );
    } catch (error) {
      console.error('Error updating lawyer profile:', error);
      throw error;
    }
  }
}
