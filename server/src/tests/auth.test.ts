import request from 'supertest';
import app from '../index';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

jest.mock('../models/User');
jest.mock('../models/Charity');
jest.mock('../config/stripe', () => ({
  getStripe: () => ({
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_test123' }) },
  }),
}));
jest.mock('../services/emailService', () => ({
  emailService: { sendWelcomeEmail: jest.fn() },
}));

describe('Auth Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/auth/signup', () => {
    it('should return 201 with token on valid signup', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        charityId: null,
        subscriptionStatus: 'inactive',
        donationPercentage: 10,
      });

      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
    });

    it('should return 400 with invalid email', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test',
        email: 'not-an-email',
        password: 'Password123!',
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 with short password', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test',
        email: 'test@example.com',
        password: 'short',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 with wrong password', async () => {
      const hash = await bcrypt.hash('correctpassword', 12);
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@example.com',
          passwordHash: hash,
          isActive: true,
          comparePassword: async (p: string) => bcrypt.compare(p, hash),
        }),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
    });
  });
});
