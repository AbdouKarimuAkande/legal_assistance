
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Legal knowledge base
const getLegalResponse = (message) => {
  const normalizedMessage = message.toLowerCase();
  
  if (normalizedMessage.includes('theft') || normalizedMessage.includes('stealing')) {
    return `**Theft in Cameroon Law**

Theft is addressed in Section 318 of the Cameroon Penal Code.

**Definition:** Theft is defined as fraudulently taking property belonging to another person.

**Penalties:**
- Simple theft: Imprisonment from 5 to 10 years and a fine
- Aggravated theft (with weapons or at night): Imprisonment from 10 to 20 years

If you're dealing with a theft case, it's advisable to consult with a licensed attorney in Cameroon for specific advice.`;
  } else if (normalizedMessage.includes('marriage') || normalizedMessage.includes('divorce')) {
    return `**Marriage and Divorce in Cameroon**

Cameroon recognizes both civil marriages and traditional marriages.

**Marriage Requirements:**
- Minimum age: 18 for males, 15 for females (with parental consent)
- No existing marriages (prohibition of polygamy in civil marriages)
- Consent of both parties

**Divorce:**
- Grounds include adultery, abandonment, and cruelty
- Both judicial and traditional divorce procedures exist
- Child custody typically favors the mother for young children

The Civil Status Registration Ordinance (No. 81-02) governs civil marriages and divorces in Cameroon.`;
  } else if (normalizedMessage.includes('assault') || normalizedMessage.includes('battery')) {
    return `**Assault in Cameroon Law**

Assault is covered under Section 337 of the Cameroon Penal Code.

**Definition:** Assault refers to any force intentionally applied to another person without their consent.

**Penalties:**
- Simple assault: Imprisonment from 6 days to 3 years and a fine
- Aggravated assault (causing serious harm): Imprisonment from 5 to 10 years
- Assault resulting in death unintentionally: Imprisonment from 6 to 20 years

Self-defense is recognized as a legal justification under certain circumstances, outlined in Section 84 of the Penal Code.`;
  } else {
    return `Thank you for your question about Cameroon's legal system. To provide you with accurate information, I would need to research specific Cameroon laws and regulations related to this topic.

If you have questions about a specific area of law, such as criminal law, family law, property rights, or business regulations, please let me know and I can provide more targeted information.

**Common Legal Areas:**
- Criminal Law (theft, assault, fraud)
- Family Law (marriage, divorce, inheritance)
- Property Law (land ownership, disputes)
- Business Law (contracts, employment)
- Civil Rights and Procedures`;
  }
};

// Routes
app.post('/api/chat/sessions', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: title || 'New Chat' })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/chat/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const sessions = data.map(session => ({
      id: session.id,
      userId: session.user_id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/chat/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const userId = req.user.userId;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing sessionId or message' });
    }

    // Add user message
    const { data: userMessage, error: userError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        message,
        sender: 'user',
      })
      .select()
      .single();

    if (userError) throw userError;

    // Generate bot response
    const botResponse = getLegalResponse(message);

    // Add bot message
    const { data: botMessage, error: botError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        message: botResponse,
        sender: 'bot',
      })
      .select()
      .single();

    if (botError) throw botError;

    res.json({
      userMessage: {
        id: userMessage.id,
        sessionId: userMessage.session_id,
        userId: userMessage.user_id,
        message: userMessage.message,
        sender: userMessage.sender,
        createdAt: userMessage.created_at,
      },
      botMessage: {
        id: botMessage.id,
        sessionId: botMessage.session_id,
        userId: botMessage.user_id,
        message: botMessage.message,
        sender: botMessage.sender,
        createdAt: botMessage.created_at,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/chat/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const messages = data.map(message => ({
      id: message.id,
      sessionId: message.session_id,
      userId: message.user_id,
      message: message.message,
      sender: message.sender,
      createdAt: message.created_at,
    }));

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'chat-service' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat service running on port ${PORT}`);
});
