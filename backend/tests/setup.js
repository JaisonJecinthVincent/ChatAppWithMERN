// Test setup file for Jest
// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test_chat_db';
process.env.PORT = '5001';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock console methods in tests to keep output clean
const originalConsole = console;

beforeEach(() => {
  // You can uncomment these if you want to suppress console output in tests
  // console.log = jest.fn();
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterEach(() => {
  // Restore console
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  cookies: {},
  ...overrides
});

global.createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis()
  };
  return res;
};

// Mock socket.io for tests
global.createMockSocket = (overrides = {}) => ({
  id: 'mock-socket-id',
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  handshake: {
    auth: {},
    address: '127.0.0.1'
  },
  ...overrides
});

console.log('Test setup completed');