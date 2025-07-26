const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs-extra');

const execAsync = promisify(exec);

describe('Foundry Integration Tests', () => {
  const foundryProjectPath = __dirname;
  const binPath = path.join(__dirname, '../../bin/gas-guardian.js');

  test('should detect foundry project', async () => {
    const foundryTomlExists = await fs.pathExists(path.join(foundryProjectPath, 'foundry.toml'));
    expect(foundryTomlExists).toBe(true);
  });

  test('should analyze foundry contract with gas guardian', async () => {
    const contractPath = path.join(foundryProjectPath, 'src/TestContract.sol');
    
    try {
      const { stdout } = await execAsync(`node ${binPath} analyze ${contractPath} --framework foundry --output table`, {
        timeout: 30000
      });
      
      expect(stdout).toContain('Gas Guardian');
      expect(stdout).toContain('TestContract');
    } catch (error) {
      // Skip if foundry not available
      if (error.message.includes('forge') || error.message.includes('command not found')) {
        console.warn('Foundry not available, skipping test');
        return;
      }
      throw error;
    }
  }, 30000);
});
