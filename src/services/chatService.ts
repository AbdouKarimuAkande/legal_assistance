
import { pool } from '../lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
    const sessionId = uuidv4();
    
    await pool.execute<ResultSetHeader>(
      'INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)',
      [sessionId, userId, title]
    );

    const [sessions] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_sessions WHERE id = ?',
      [sessionId]
    );

    const session = sessions[0];
    return {
      id: session.id,
      userId: session.user_id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }

  async getSessions(userId: string): Promise<ChatSession[]> {
    const [sessions] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    return sessions.map(session => ({
      id: session.id,
      userId: session.user_id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  }

  async addMessage(sessionId: string, userId: string, message: string, sender: 'user' | 'bot'): Promise<ChatMessage> {
    const messageId = uuidv4();
    
    await pool.execute<ResultSetHeader>(
      'INSERT INTO chat_messages (id, session_id, user_id, message, sender) VALUES (?, ?, ?, ?, ?)',
      [messageId, sessionId, userId, message, sender]
    );

    const [messages] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_messages WHERE id = ?',
      [messageId]
    );

    const msg = messages[0];
    return {
      id: msg.id,
      sessionId: msg.session_id,
      userId: msg.user_id,
      message: msg.message,
      sender: msg.sender,
      createdAt: msg.created_at,
    };
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const [messages] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );

    return messages.map(message => ({
      id: message.id,
      sessionId: message.session_id,
      userId: message.user_id,
      message: message.message,
      sender: message.sender,
      createdAt: message.created_at,
    }));
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await pool.execute<ResultSetHeader>(
      'UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, sessionId]
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    await pool.execute<ResultSetHeader>(
      'DELETE FROM chat_sessions WHERE id = ?',
      [sessionId]
    );
  }
}
