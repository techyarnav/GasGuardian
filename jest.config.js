module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/unit/**/*.test.js',
    '**/test/integration/**/*.test.js',
    '**/test/foundry-tests/**/*.test.js',
    '**/test/hardhat-tests/*-integration.test.js'  
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/',
    '/test/hardhat-tests/test/',     
    '/test/foundry-tests/test/',     
    '/test/hardhat-tests/node_modules/'
  ],
  collectCoverageFrom: [
    'core/**/*.js',
    'cli/**/*.js',
    'bin/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 30000,
  verbose: true
};
