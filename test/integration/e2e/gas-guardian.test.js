const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs-extra');

const execAsync = promisify(exec);

describe('Gas Guardian E2E Tests', () => {
  const binPath = path.join(__dirname, '../../../bin/gas-guardian.js');
  let tempContract;

  beforeAll(async () => {
    tempContract = createTempFile(TEST_CONTRACTS.COMPLEX, '.sol');
  });

  afterAll(() => {
    if (tempContract) {
      tempContract.cleanup();
    }
  });

  test('should analyze contract successfully', async () => {
    const { stdout } = await execAsync(`node ${binPath} suggest ${tempContract.path}`);
    
    expect(stdout).toContain('Gas Guardian - Optimization Suggestions');
    expect(stdout).toContain('Analysis complete');
    expect(stdout).toContain('transfer');
    expect(stdout).toContain('batchTransfer');
  });

  test('should handle AI suggestions', async () => {
    const { stdout } = await execAsync(`node ${binPath} suggest ${tempContract.path} --llm --model solidityGPT`);
    
    expect(stdout).toContain('Gas Guardian');
    expect(stdout).toContain('LLM enabled: Yes');
    expect(stdout).toContain('AI-powered suggestions');
  }, 10000);

  test('should show help information', async () => {
    const { stdout } = await execAsync(`node ${binPath} --help`);
    
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('suggest');
    expect(stdout).toContain('analyze');
  });

  test('should handle multiple contracts', async () => {
    const tempContract2 = createTempFile(TEST_CONTRACTS.SIMPLE, '.sol');
    
    try {
      const { stdout } = await execAsync(`node ${binPath} suggest ${tempContract.path} ${tempContract2.path}`);
      expect(stdout).toContain('transfer'); // From complex contract
      expect(stdout).toContain('setValue'); // From simple contract
    } finally {
      tempContract2.cleanup();
    }
  });

  test('should handle invalid file gracefully', async () => {
    const { stdout, stderr } = await execAsync(
      `node ${binPath} suggest /nonexistent/file.sol`,
      { encoding: 'utf8' }
    ).catch(e => e);
    
    expect(stderr || stdout).toContain('File not found');
  });
});
