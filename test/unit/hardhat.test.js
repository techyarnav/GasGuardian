const { HardhatAdapter } = require('../../core/adapters/hardhat');
const fs = require('fs-extra');
const path = require('path');

describe('HardhatAdapter', () => {
  let adapter;
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
    adapter = new HardhatAdapter({ projectRoot: tempDir.name });
  });

  afterEach(() => {
    if (tempDir?.removeCallback) {
      tempDir.removeCallback();
    }
  });

  describe('isHardhatProject', () => {
    test('should detect hardhat.config.js', async () => {
      await fs.writeFile(path.join(tempDir.name, 'hardhat.config.js'), 'module.exports = {};');
      
      const result = await adapter.isHardhatProject();
      expect(result).toBe(true);
    });

    test('should detect hardhat dependency in package.json', async () => {
      const packageJson = {
        devDependencies: {
          hardhat: '^2.19.0'
        }
      };
      await fs.writeJson(path.join(tempDir.name, 'package.json'), packageJson);
      
      const result = await adapter.isHardhatProject();
      expect(result).toBe(true);
    });

    test('should return false for non-hardhat project', async () => {
      const result = await adapter.isHardhatProject();
      expect(result).toBe(false);
    });
  });

  describe('parseTestOutput', () => {
    test('should parse console gas output', () => {
      const testOutput = `
        Transfer gas used: 51592
        Batch transfer (5 recipients) gas used: 157480
        Mint gas used: 112656
      `;
      
      const result = adapter.parseTestOutput(testOutput);
      
      expect(result).toEqual({
        transfer: 51592,
        batchtransfer: 157480,
        mint: 112656
      });
    });

    test('should handle empty output', () => {
      const result = adapter.parseTestOutput('');
      expect(result).toEqual({});
    });
  });

  describe('findHardhatProjectRoot', () => {
    test('should find project root from contract path', async () => {
      const contractsDir = path.join(tempDir.name, 'contracts');
      await fs.ensureDir(contractsDir);
      await fs.writeFile(path.join(tempDir.name, 'hardhat.config.js'), 'module.exports = {};');
      
      const contractPath = path.join(contractsDir, 'Contract.sol');
      const result = await adapter.findHardhatProjectRoot(contractPath);
      
      expect(result).toBe(tempDir.name);
    });

    test('should return null when no project found', async () => {
      const deepTempDir = path.join(tempDir.name, 'very', 'deep', 'nested', 'path');
      await fs.ensureDir(deepTempDir);
      
      const contractPath = path.join(deepTempDir, 'Contract.sol');
      const result = await adapter.findHardhatProjectRoot(contractPath);
      
      expect(result).toBe(null);
    });
  });
});
