
import { supabase } from '../lib/supabase';

export class DatabaseService {
  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Database connection test failed:', error);
        return false;
      }
      
      console.log('Database connection successful');
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      return false;
    }
  }

  // Initialize database tables if they don't exist
  static async initializeTables(): Promise<void> {
    try {
      // Check if tables exist by trying to query them
      const tables = ['users', 'chat_sessions', 'chat_messages', 'verification_codes'];
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error && error.code === 'PGRST116') {
          console.warn(`Table ${table} does not exist. Please run migrations.`);
        }
      }
    } catch (error) {
      console.error('Error checking tables:', error);
    }
  }

  // Get user by email
  static async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error);
      throw error;
    }

    return data;
  }

  // Create or update user
  static async upsertUser(userData: any) {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData)
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      throw error;
    }

    return data;
  }
}

export default DatabaseService;
