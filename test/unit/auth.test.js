
const request = require('supertest');
const app = require('../../microservices/auth-service/index');
const bcrypt = require('bcryptjs');

describe('Authentication Service', () => {
  beforeEach(() => {
    // Reset database state
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        twoFactorEnabled: false
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123',
        twoFactorEnabled: false
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'Password123!',
        twoFactorEnabled: false
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const userData = {
        name: 'Test User',
        email: 'login@example.com',
        password: 'Password123!',
        twoFactorEnabled: false
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should require 2FA when enabled', async () => {
      const userData = {
        name: 'Test User',
        email: '2fa@example.com',
        password: 'Password123!',
        twoFactorEnabled: true,
        twoFactorMethod: '2fa_email'
      };

      // Register user with 2FA
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login should require 2FA
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.requireTwoFactor).toBe(true);
      expect(response.body.twoFactorMethod).toBe('2fa_email');
    });
  });
});
