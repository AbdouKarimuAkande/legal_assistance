
import { supabase } from '../lib/supabase';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  message: string;
  sender: 'user' | 'bot';
  createdAt: string;
}

export class ChatService {
  async createSession(userId: string, title: string): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data.map(session => ({
      id: session.id,
      userId: session.user_id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  }

  async addMessage(sessionId: string, userId: string, message: string, sender: 'user' | 'bot'): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        message,
        sender,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      sessionId: data.session_id,
      userId: data.user_id,
      message: data.message,
      sender: data.sender,
      createdAt: data.created_at,
    };
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(message => ({
      id: message.id,
      sessionId: message.session_id,
      userId: message.user_id,
      message: message.message,
      sender: message.sender,
      createdAt: message.created_at,
    }));
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }
}
