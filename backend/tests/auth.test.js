const request = require('supertest');

// Mock Supabase before requiring app
jest.mock('../config/supabase', () => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

// Set required env vars before requiring app
process.env.JWT_SECRET = 'test-secret-key';
process.env.BCRYPT_SALT_ROUNDS = '1';

const app = require('../server');
const supabase = require('../config/supabase');

describe('POST /api/auth/signup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test', email: 'a@b.com', password: 'pass123', role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });

  it('returns 409 when email already exists', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
      single: jest.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
      insert: jest.fn().mockReturnThis(),
    });

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test', email: 'exists@b.com', password: 'pass123', role: 'user',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for non-existent user', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'noone@b.com', password: 'wrong',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });
});
