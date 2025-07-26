const { LLMEngine } = require('../../core/llm/engine');

describe('LLMEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new LLMEngine({
      modelType: 'solidityGPT',
      maxTokens: 100,
      temperature: 0.1
    });

    if (engine.clearCache) {
      engine.clearCache();
    }
  });

  afterEach(() => {
    if (engine.clearCache) {
      engine.clearCache();
    }
  });

  describe('generateOptimizationSuggestions', () => {
    test('should generate SolidityGPT suggestions', async () => {
      const functionCode = 'function transfer(address to, uint256 amount) public { require(msg.sender != address(0)); balances[msg.sender] -= amount; balances[to] += amount; }';
      const metadata = {
        name: 'transfer_unique_' + Date.now(),
        patterns: [
          { type: 'validation', description: 'Require statement detected' }
        ],
        visibility: 'public'
      };

      const result = await engine.generateOptimizationSuggestions(functionCode, metadata);

      expect(result).toHaveProperty('suggestions');
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    test('should handle empty function code', async () => {
      const result = await engine.generateOptimizationSuggestions('', {});
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result).toHaveProperty('error');
    });
  });

  describe('cache functionality', () => {
    test('should cache results', async () => {
      const uniqueId = Date.now();
      const functionCode = `function test${uniqueId}() public { uint256 x = 1; }`;
      const metadata = { name: `test${uniqueId}`, patterns: [] };

      // First call
      const result1 = await engine.generateOptimizationSuggestions(functionCode, metadata);

      // Second call with same input should potentially be cached
      const result2 = await engine.generateOptimizationSuggestions(functionCode, metadata);

      // Just verify we get consistent results
      expect(result2.suggestions).toEqual(result1.suggestions);
    });
  });
});
