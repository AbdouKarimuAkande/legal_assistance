
import { pool, generateCharId } from '../lib/mysql';

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  message: string;
  sender: 'user' | 'bot';
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export class ChatService {
  async createSession(userId: string, title: string): Promise<ChatSession> {
    try {
      const sessionId = generateCharId();
      
      await pool.execute(
        `INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)`,
        [sessionId, userId, title]
      );

      const [sessions] = await pool.execute(
        'SELECT * FROM chat_sessions WHERE id = ?',
        [sessionId]
      );

      const session = (sessions as any[])[0];
      
      return {
        id: session.id,
        userId: session.user_id,
        title: session.title,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      };
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {
      const [sessions] = await pool.execute(
        'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
        [userId]
      );

      return (sessions as any[]).map(session => ({
        id: session.id,
        userId: session.user_id,
        title: session.title,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  }

  async addMessage(
    sessionId: string,
    userId: string,
    message: string,
    sender: 'user' | 'bot'
  ): Promise<ChatMessage> {
    try {
      const messageId = generateCharId();
      
      await pool.execute(
        `INSERT INTO chat_messages (id, session_id, user_id, message, sender) 
         VALUES (?, ?, ?, ?, ?)`,
        [messageId, sessionId, userId, message, sender]
      );

      // Update session timestamp
      await pool.execute(
        'UPDATE chat_sessions SET updated_at = NOW() WHERE id = ?',
        [sessionId]
      );

      const [messages] = await pool.execute(
        'SELECT * FROM chat_messages WHERE id = ?',
        [messageId]
      );

      const msg = (messages as any[])[0];
      
      return {
        id: msg.id,
        sessionId: msg.session_id,
        userId: msg.user_id,
        message: msg.message,
        sender: msg.sender,
        createdAt: msg.created_at,
      };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const [messages] = await pool.execute(
        'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId]
      );

      return (messages as any[]).map(msg => ({
        id: msg.id,
        sessionId: msg.session_id,
        userId: msg.user_id,
        message: msg.message,
        sender: msg.sender,
        createdAt: msg.created_at,
      }));
    } catch (error) {
      console.error('Error fetching session messages:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      // Delete messages first
      await pool.execute(
        'DELETE FROM chat_messages WHERE session_id = ?',
        [sessionId]
      );

      // Delete session
      await pool.execute(
        'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  async generateBotResponse(message: string): Promise<string> {
    // Simple legal assistant responses
    const legalKeywords = {
      'contract': 'For contract-related issues, ensure all terms are clearly defined and both parties understand their obligations. Consider consulting with a lawyer for complex agreements.',
      'divorce': 'Divorce proceedings can be complex. You may need to consider asset division, child custody, and support arrangements. I recommend consulting with a family law attorney.',
      'employment': 'Employment law covers various aspects including wrongful termination, discrimination, and wage disputes. Document all relevant communications and consider legal consultation.',
      'personal injury': 'For personal injury cases, document all medical treatments, keep records of expenses, and avoid settling too quickly. Consult with a personal injury attorney.',
      'property': 'Property law issues can involve disputes over ownership, boundaries, or leases. Gather all relevant documents and consider professional legal advice.',
      'criminal': 'Criminal law matters are serious and require immediate professional legal representation. Contact a criminal defense attorney as soon as possible.',
      'business': 'Business law encompasses formation, contracts, compliance, and disputes. Proper legal structure and documentation are essential for protection.',
      'default': 'I understand you have a legal question. Could you provide more specific details about your situation? I can offer general guidance on various legal topics including contracts, employment, family law, and more.'
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [keyword, response] of Object.entries(legalKeywords)) {
      if (keyword !== 'default' && lowerMessage.includes(keyword)) {
        return response;
      }
    }
    
    return legalKeywords.default;
  }
}
