# Clustered Chat App - Testing Guide

## Overview

This testing suite provides comprehensive testing for the clustered Node.js chat application, including unit tests, integration tests, cluster functionality tests, and load testing.

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   └── socket.test.js       # Socket.IO functionality tests
├── integration/             # Integration tests  
│   ├── api.test.js         # API endpoint tests
│   └── cluster.test.js     # Cluster integration tests
├── load/                   # Load testing
│   ├── cluster-load-test.yml    # Artillery configuration
│   └── socket-load-test.js      # Socket.IO load test
├── setup.js               # Jest setup and configuration
└── run-all-tests.js       # Comprehensive test runner
```

## Test Categories

### 1. Unit Tests
**Purpose**: Test individual functions and components in isolation.

**Coverage**:
- Socket.IO helper functions
- User socket management  
- Group socket management
- Statistics collection
- Error handling

**Run Command**:
```bash
npm run test:unit
```

### 2. Integration Tests  
**Purpose**: Test API endpoints and component interactions.

**Coverage**:
- Authentication endpoints (signup, login, logout)
- Message endpoints (send, retrieve, users list)
- Group endpoints (create, join, list)
- Health check endpoints
- Rate limiting functionality
- Error handling and validation

**Run Command**:
```bash
npm run test:integration
```

### 3. Cluster Tests
**Purpose**: Test cluster functionality and multi-process behavior.

**Coverage**:
- Master/worker process management
- Worker restart and recovery
- Load balancing across workers
- Socket.IO clustering with Redis
- Multi-client connection handling

**Run Command**:
```bash
npm run test:cluster
```

### 4. Load Tests
**Purpose**: Test performance under high load conditions.

**Coverage**:
- High concurrent user connections
- Message throughput
- Response time under load
- Resource utilization
- Error rates under stress

**Socket.IO Load Test**:
```bash
npm run test:load
```

**Artillery Load Test**:
```bash
npm run test:load:artillery
```

## Running Tests

### Individual Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# Cluster tests only
npm run test:cluster

# Load tests only
npm run test:load

# All tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Comprehensive Test Suite

```bash
# Run all tests in sequence
npm run test:all
```

This runs:
1. Unit tests
2. Integration tests  
3. Cluster functionality tests
4. Load tests with performance metrics

### Performance Testing

```bash
# Start cluster and run load test
npm run test:performance
```

## Test Configuration

### Jest Configuration (`jest.config.json`)
- Test environment: Node.js
- Test timeout: 30 seconds
- Setup file: `tests/setup.js`
- Coverage collection from `src/` directory
- Single worker mode to avoid conflicts

### Environment Variables for Testing
```bash
NODE_ENV=test
PORT=0                    # Random port assignment
JWT_SECRET=test-secret-key
MONGODB_URI=<in-memory-db>
MAX_WORKERS=2            # Fewer workers for testing
```

## Load Test Configuration

### Socket.IO Load Test Parameters
```javascript
{
  url: 'http://localhost:5001',
  totalUsers: 500,         // Total users to simulate
  concurrentUsers: 50,     // Concurrent connection batch size
  testDuration: 120000,    # Test duration (2 minutes)  
  messageInterval: 2000    # Message sending interval
}
```

### Artillery Load Test Phases
1. **Warm-up**: 30s at 10 requests/sec
2. **Ramp-up**: 60s ramping from 20 to 100 requests/sec
3. **Peak Load**: 120s at 100 requests/sec
4. **Cool-down**: 30s ramping from 100 to 10 requests/sec

## Performance Expectations

### Response Time Targets
- **P95**: < 2000ms (95% of requests under 2 seconds)
- **P99**: < 5000ms (99% of requests under 5 seconds)

### Success Rate Targets
- **HTTP 200**: > 85% success rate
- **HTTP 4xx**: < 10% client errors  
- **HTTP 5xx**: < 5% server errors

### Connection Performance
- **Socket Connection**: < 1000ms average
- **Message Latency**: < 500ms average
- **Concurrent Users**: Support 500+ connections

## Interpreting Test Results

### Test Status Icons
- ✅ **PASSED**: Test completed successfully
- ❌ **FAILED**: Test failed with assertions/errors
- ⚠️ **PARTIAL**: Some components passed, others failed
- 💥 **ERROR**: Test encountered runtime errors

### Performance Assessment
- **EXCELLENT**: >95% success rate, <1s avg response time
- **GOOD**: >90% success rate, <2s avg response time  
- **FAIR**: >80% success rate, reasonable response times
- **POOR**: <80% success rate, high response times

### Common Issues and Solutions

#### Unit Test Failures
- **Cause**: Core functionality bugs
- **Solution**: Fix individual functions and retry

#### Integration Test Failures  
- **Cause**: API endpoint issues, authentication problems
- **Solution**: Check route handlers, middleware, database connections

#### Cluster Test Failures
- **Cause**: Worker management issues, Redis connectivity
- **Solution**: Verify cluster.js logic, Redis configuration, port conflicts

#### Load Test Failures
- **Cause**: Performance bottlenecks, resource limits
- **Solution**: Optimize database queries, increase worker count, tune rate limits

## Continuous Integration

### Pre-commit Testing
```bash
# Quick smoke test
npm run test:unit && npm run test:integration
```

### Pre-deployment Testing  
```bash
# Full test suite
npm run test:all
```

### Production Monitoring
- Set up health check endpoints
- Monitor response times and error rates
- Alert on performance degradation
- Regular load testing in staging environment

## Test Data Management

### Database Setup
- Uses MongoDB Memory Server for isolated testing
- Automatic cleanup between tests
- Seeded data for consistent test scenarios

### Test User Management
- Unique test users generated per test
- Automatic cleanup after test completion
- No interference between test runs

## Debugging Tests

### Verbose Output
```bash
NODE_ENV=test DEBUG=* npm run test
```

### Individual Test Debugging
```bash
# Run specific test file
npx jest tests/unit/socket.test.js --verbose

# Run specific test case
npx jest tests/unit/socket.test.js --testNamePattern="should manage user socket mapping"
```

### Load Test Debugging
```bash
# Reduce load for debugging
node tests/load/socket-load-test.js --totalUsers 10 --testDuration 10000
```

## Contributing to Tests

### Adding New Tests
1. Place unit tests in `tests/unit/`
2. Place integration tests in `tests/integration/`  
3. Follow existing naming conventions
4. Include both positive and negative test cases
5. Add appropriate setup/cleanup

### Test Best Practices
- Use descriptive test names
- Test one concept per test case
- Mock external dependencies appropriately
- Clean up resources after tests
- Include edge cases and error conditions

## Conclusion

This comprehensive testing suite ensures that the clustered chat application performs reliably under various conditions. Regular testing helps maintain code quality, catch regressions early, and validate performance improvements.