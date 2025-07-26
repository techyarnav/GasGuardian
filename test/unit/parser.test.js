const { parseContractFile } = require('../../core/parser');
const fs = require('fs-extra');
const path = require('path');

describe('Parser', () => {
  let tempFile;
  
  afterEach(() => {
    if (tempFile?.cleanup) {
      tempFile.cleanup();
    }
  });

  describe('parseContractFile', () => {
    test('should parse simple contract correctly', async () => {
      tempFile = createTempFile(TEST_CONTRACTS.SIMPLE);
      
      const result = await parseContractFile(tempFile.path);
      
      expect(result).toHaveProperty('name', 'SimpleContract');
      expect(result).toHaveProperty('functions');
      expect(result.functions).toHaveLength(2);
      
      const setValueFunc = result.functions.find(f => f.name === 'setValue');
      expect(setValueFunc).toBeDefined();
      expect(setValueFunc.visibility).toBe('public');
      expect(setValueFunc.parameters).toHaveLength(1);
      expect(setValueFunc.sourceCode).toContain('function setValue');
    });

    test('should parse complex contract with patterns', async () => {
      tempFile = createTempFile(TEST_CONTRACTS.COMPLEX);
      
      const result = await parseContractFile(tempFile.path);
      
      expect(result.name).toBe('ComplexContract');
      expect(result.functions).toHaveLength(3);
      
      const batchTransferFunc = result.functions.find(f => f.name === 'batchTransfer');
      expect(batchTransferFunc).toBeDefined();
      expect(batchTransferFunc.patterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'loop' }),
          expect.objectContaining({ type: 'storage_write' })
        ])
      );
    });

    test('should handle non-existent file', async () => {
      await expect(parseContractFile('/non/existent/file.sol'))
        .rejects.toThrow('File not found');
    });

    test('should handle invalid Solidity syntax', async () => {
      tempFile = createTempFile('invalid solidity code');
      
      const result = await parseContractFile(tempFile.path);
      expect(result.name).toBe('InvalidContract');
      expect(result.functions).toHaveLength(0);
    });
  });
});
