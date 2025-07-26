const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

describe('CLI Basic Functionality', () => {
  const binPath = path.join(__dirname, "../../bin/gas-guardian.js");

  test('should show version', async () => {
    const { stdout } = await execAsync(`node ${binPath} --version`);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should show help', async () => {
    const { stdout } = await execAsync(`node ${binPath} --help`);
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('suggest');
    expect(stdout).toContain('analyze');
  });

  test('should handle analyze command', async () => {
    const tempFile = createTempFile(TEST_CONTRACTS.SIMPLE);
    try {
      const { stdout } = await execAsync(`node ${binPath} suggest ${tempFile.path}`);
      expect(stdout).toContain('Gas Guardian');
      expect(stdout).toContain('Analysis complete');
    } finally {
      tempFile.cleanup();
    }
  });
});
