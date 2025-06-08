
const request = require('supertest');
const app = require('../../microservices/chat-service/index');

describe('Chat Service Integration', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Setup test user and get auth token
    const authResponse = await request(require('../../microservices/auth-service/index'))
      .post('/api/auth/register')
      .send({
        name: 'Chat Test User',
        email: 'chat@test.com',
        password: 'Password123!',
        twoFactorEnabled: false
      });

    authToken = authResponse.body.token;
    userId = authResponse.body.user.id;
  });

  describe('Chat Sessions', () => {
    it('should create a new chat session', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Legal Question About Property'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Legal Question About Property');
      expect(response.body.userId).toBe(userId);
    });

    it('should retrieve user chat sessions', async () => {
      // Create a session first
      await request(app)
        .post('/api/chat/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Session'
        });

      const response = await request(app)
        .get('/api/chat/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Chat Messages', () => {
    let sessionId;

    beforeEach(async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Message Test Session'
        });

      sessionId = sessionResponse.body.id;
    });

    it('should send a message in a session', async () => {
      const message = 'What are my rights regarding property inheritance?';

      const response = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message,
          sender: 'user'
        })
        .expect(201);

      expect(response.body.message).toBe(message);
      expect(response.body.sender).toBe('user');
      expect(response.body.sessionId).toBe(sessionId);
    });

    it('should retrieve messages for a session', async () => {
      // Send a message first
      await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: 'Test message',
          sender: 'user'
        });

      const response = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('AI Integration', () => {
    it('should integrate with AI model for responses', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'AI Integration Test'
        });

      const sessionId = sessionResponse.body.id;

      // Send user message
      await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: 'What is the legal age of consent in Cameroon?',
          sender: 'user'
        });

      // Should automatically generate AI response
      const messagesResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(messagesResponse.body.length).toBe(2); // User message + AI response
      expect(messagesResponse.body[1].sender).toBe('bot');
    });
  });
});
