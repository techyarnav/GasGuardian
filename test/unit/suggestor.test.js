const { SuggestionEngine } = require('../../core/suggestor');

describe('SuggestionEngine', () => {
  let suggestor;

  beforeEach(() => {
    suggestor = new SuggestionEngine({
      enableLLM: false,
      llmOptions: { modelType: 'solidityGPT' }
    });
  });

  describe('generateSuggestions', () => {
    test('should generate suggestions for function with patterns', async () => {
      const functionData = {
        name: 'batchTransfer',
        visibility: 'public',
        patterns: [
          { type: 'loop', description: 'Loop detected' },
          { type: 'storage_write', description: 'Storage writes detected' }
        ],
        sourceCode: 'function batchTransfer(...) { for (...) { ... } }'
      };

      const suggestions = await suggestor.generateSuggestions(functionData);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            message: expect.any(String),
            impact: expect.stringMatching(/^(high|medium|low)$/),
            confidence: expect.any(Number)
          })
        ])
      );
    });

    test('should handle function without patterns', async () => {
      const functionData = {
        name: 'simpleGetter',
        visibility: 'public',
        patterns: [],
        sourceCode: 'function getValue() public view returns (uint256) { return value; }'
      };

      const suggestions = await suggestor.generateSuggestions(functionData);
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('deduplicateAndRank', () => {
    test('should remove duplicate suggestions', () => {
      const suggestions = [
        { message: 'Use external instead of public', impact: 'low', confidence: 0.8 },
        { message: 'Use external instead of public', impact: 'low', confidence: 0.7 },
        { message: 'Cache array length', impact: 'medium', confidence: 0.9 }
      ];

      const result = suggestor.deduplicateAndRank(suggestions);

      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Cache array length');
    });

    test('should rank by impact and confidence', () => {
      const suggestions = [
        { message: 'Low impact', impact: 'low', confidence: 0.9 },
        { message: 'High impact', impact: 'high', confidence: 0.8 },
        { message: 'Medium impact', impact: 'medium', confidence: 0.9 }
      ];

      const result = suggestor.deduplicateAndRank(suggestions);

      expect(result[0].message).toBe('High impact');
      expect(result[1].message).toBe('Medium impact');
      expect(result[2].message).toBe('Low impact');
    });
  });
});
