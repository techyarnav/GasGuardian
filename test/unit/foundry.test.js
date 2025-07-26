const { FoundryAdapter } = require('../../core/adapters/foundry');
const fs = require('fs-extra');
const path = require('path');

describe('FoundryAdapter', () => {
  let adapter;
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
    adapter = new FoundryAdapter({ projectRoot: tempDir.name });
  });

  afterEach(() => {
    if (tempDir?.removeCallback) {
      tempDir.removeCallback();
    }
  });

  describe('isFoundryProject', () => {
    test('should detect foundry.toml', async () => {
      await fs.writeFile(path.join(tempDir.name, 'foundry.toml'), '[profile.default]');
      
      const result = await adapter.isFoundryProject();
      expect(result).toBe(true);
    });

    test('should detect lib directory', async () => {
      await fs.ensureDir(path.join(tempDir.name, 'lib'));
      
      const result = await adapter.isFoundryProject();
      expect(result).toBe(true);
    });

    test('should return false for non-foundry project', async () => {
      const result = await adapter.isFoundryProject();
      expect(result).toBe(false);
    });
  });

  describe('parseSnapshotFile', () => {
    test('should parse gas snapshot correctly', () => {
      const result = adapter.parseSnapshotFile(TEST_CONTRACTS.GAS_SNAPSHOT);
      
      expect(result).toEqual({
        approve: 39071,
        batchtransfer: 189623,
        mint: 103729,
        transfer: 133128,
        inefficientsum: 205766
      });
    });

    test('should handle empty snapshot', () => {
      const result = adapter.parseSnapshotFile('');
      expect(result).toEqual({});
    });
  });

  describe('extractFunctionName', () => {
    test('should extract function names correctly', () => {
      expect(adapter.extractFunctionName('testTransfer')).toBe('transfer');
      expect(adapter.extractFunctionName('test_batchTransfer')).toBe('batchtransfer');
      expect(adapter.extractFunctionName('TestApprove')).toBe('approve');
      expect(adapter.extractFunctionName('invalidTest')).toBe(null);
    });
  });

  describe('findFoundryProjectRoot', () => {
    test('should find project root from contract path', async () => {
      const srcDir = path.join(tempDir.name, 'src');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(tempDir.name, 'foundry.toml'), '[profile.default]');
      
      const contractPath = path.join(srcDir, 'Contract.sol');
      const result = await adapter.findFoundryProjectRoot(contractPath);
      
      expect(result).toBe(tempDir.name);
    });

    test('should return null when no project found', async () => {
      const deepTempDir = path.join(tempDir.name, 'very', 'deep', 'nested', 'path');
      await fs.ensureDir(deepTempDir);
      
      const contractPath = path.join(deepTempDir, 'Contract.sol');
      const result = await adapter.findFoundryProjectRoot(contractPath);
      
      expect(result).toBe(null);
    });
  });
});
