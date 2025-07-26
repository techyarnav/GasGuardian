// Global test helpers and utilities
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');

// Helper to create temporary files for testing
global.createTempFile = (content, extension = '.sol') => {
  const tempFile = tmp.fileSync({ 
    postfix: extension,
    keep: false
  });
  
  fs.writeFileSync(tempFile.name, content);
  
  return {
    path: tempFile.name,
    cleanup: () => {
      try {
        tempFile.removeCallback();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  };
};

// Helper to create temporary directories
global.createTempDir = () => {
  return tmp.dirSync({ 
    unsafeCleanup: true,
    keep: false
  });
};

// Test contract templates
global.TEST_CONTRACTS = {
  SIMPLE: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleContract {
    uint256 public value;
    mapping(address => uint256) public data;
    
    function setValue(uint256 _value) public {
        value = _value;
    }
    
    function setData(address user, uint256 amount) public {
        data[user] = amount;
    }
}`,

  COMPLEX: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ComplexContract {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    function mint(address to, uint256 amount) public {
        require(to != address(0), "Invalid address");
        balances[to] += amount;
        totalSupply += amount;
    }
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external {
        for (uint256 i = 0; i < recipients.length; i++) {
            balances[msg.sender] -= amounts[i];
            balances[recipients[i]] += amounts[i];
        }
    }
}`,

  // Fixed: Updated to match the actual Foundry snapshot format
  GAS_SNAPSHOT: `TestContract:testApprove() (gas: 39071)
TestContract:testBatchTransfer() (gas: 189623)
TestContract:testMint() (gas: 103729)
TestContract:testTransfer() (gas: 133128)
TestContract:testInefficientSum() (gas: 205766)`
};

// Increase timeout for AI model tests
jest.setTimeout(30000);

// Suppress console output during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  if (process.env.NODE_ENV === 'test' && !process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  if (process.env.NODE_ENV === 'test' && !process.env.JEST_VERBOSE) {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  }
});

// Clean up any temporary files after each test
afterEach(() => {
  // Clean up any test artifacts
  const tempFiles = ['TestRefactored.sol', 'TestNormalUsage.sol', 'invalid.sol'];
  tempFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});
