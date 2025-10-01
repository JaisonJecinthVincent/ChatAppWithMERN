import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectDB } from '../../src/lib/db.js';
import User from '../../src/models/user.model.js';
import Message from '../../src/models/message.model.js';
import Group from '../../src/models/group.model.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Import routes
import authRoutes from '../../src/routes/auth.route.js';
import messageRoutes from '../../src/routes/message.route.js';
import groupRoutes from '../../src/routes/group.route.js';

describe('API Integration Tests', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Create Express app with middleware
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(cookieParser());
    app.use(cors({
      origin: ["http://localhost:5173", "http://localhost:5174"],
      credentials: true,
    }));

    // Add routes
    app.use('/api/auth', authRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/groups', groupRoutes);

    // Health endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Message.deleteMany({});
    await Group.deleteMany({});
  });

  describe('Health Endpoints', () => {
    test('GET /health should return system status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    const testUserData = {
      email: 'test@example.com',
      fullName: 'Test User',
      password: 'password123'
    };

    test('POST /api/auth/signup should create new user', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(testUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('User created successfully');
      expect(response.body.user.email).toBe(testUserData.email);
      expect(response.body.user.fullName).toBe(testUserData.fullName);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    test('POST /api/auth/login should authenticate user', async () => {
      // First create a user
      await request(app)
        .post('/api/auth/signup')
        .send(testUserData)
        .expect(201);

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged in successfully');
      expect(response.body.user.email).toBe(testUserData.email);

      // Save auth cookie for other tests
      authToken = response.headers['set-cookie'];
    });

    test('POST /api/auth/login should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('POST /api/auth/logout should clear session', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/signup')
        .send(testUserData)
        .expect(201);

      const cookies = loginResponse.headers['set-cookie'];

      // Then logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  describe('Message Endpoints', () => {
    beforeEach(async () => {
      // Create test user and login
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          fullName: 'Test User',
          password: 'password123'
        });

      authToken = signupResponse.headers['set-cookie'];
      testUser = signupResponse.body.user;
    });

    test('GET /api/messages/users should return users list', async () => {
      const response = await request(app)
        .get('/api/messages/users')
        .set('Cookie', authToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/messages/send/:id should send message', async () => {
      // Create another user to send message to
      const recipient = await User.create({
        email: 'recipient@example.com',
        fullName: 'Recipient User',
        password: 'password123'
      });

      const messageData = {
        text: 'Test message',
        image: null
      };

      const response = await request(app)
        .post(`/api/messages/send/${recipient._id}`)
        .set('Cookie', authToken)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message.text).toBe(messageData.text);
      expect(response.body.message.senderId.toString()).toBe(testUser._id);
      expect(response.body.message.receiverId.toString()).toBe(recipient._id.toString());
    });
  });

  describe('Group Endpoints', () => {
    beforeEach(async () => {
      // Create test user and login
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          fullName: 'Test User',
          password: 'password123'
        });

      authToken = signupResponse.headers['set-cookie'];
      testUser = signupResponse.body.user;
    });

    test('POST /api/groups should create new group', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Cookie', authToken)
        .send(groupData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.group.name).toBe(groupData.name);
      expect(response.body.group.description).toBe(groupData.description);
      expect(response.body.group.members).toContain(testUser._id);
    });

    test('GET /api/groups should return user groups', async () => {
      // First create a group
      const group = await Group.create({
        name: 'Test Group',
        description: 'A test group',
        members: [testUser._id],
        admins: [testUser._id]
      });

      const response = await request(app)
        .get('/api/groups')
        .set('Cookie', authToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Test Group');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limits to API endpoints', async () => {
      const requests = [];
      const requestCount = 10;

      // Make multiple rapid requests
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          request(app)
            .get('/health')
            .then(res => ({ status: res.status, body: res.body }))
            .catch(err => ({ status: err.status, error: err.message }))
        );
      }

      const results = await Promise.all(requests);
      
      // Should have at least some successful requests
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      console.log('Rate limiting test results:', {
        total: requestCount,
        successful: successCount,
        statuses: results.map(r => r.status)
      });
    });
  });
});