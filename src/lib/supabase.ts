
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', { supabaseUrl, supabaseAnonKey: supabaseAnonKey ? 'SET' : 'MISSING' });
}

export const supabase = createClient(
  supabaseUrl || 'https://xqgjtysgfcfedppwpcvq.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZ2p0eXNnZmNmZWRwcHdwY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNzI0NTAsImV4cCI6MjA2NDc0ODQ1MH0.fbj-aQSP1Yea-X99V8ow1a_k36EvaJx_l5w4k11qXA0',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
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
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          password_hash: string;
          is_lawyer?: boolean;
          two_factor_enabled?: boolean;
          two_factor_method?: '2fa_email' | '2fa_totp' | null;
          two_factor_secret?: string | null;
          phone?: string | null;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_active?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          password_hash?: string;
          is_lawyer?: boolean;
          two_factor_enabled?: boolean;
          two_factor_method?: '2fa_email' | '2fa_totp' | null;
          two_factor_secret?: string | null;
          phone?: string | null;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_active?: string | null;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          message: string;
          sender: 'user' | 'bot';
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          message: string;
          sender: 'user' | 'bot';
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          message?: string;
          sender?: 'user' | 'bot';
          created_at?: string;
        };
      };
      verification_codes: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          type: 'email_verification' | '2fa_email' | 'password_reset';
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          type: 'email_verification' | '2fa_email' | 'password_reset';
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          type?: 'email_verification' | '2fa_email' | 'password_reset';
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
