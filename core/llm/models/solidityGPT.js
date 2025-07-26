const { pipeline } = require('@xenova/transformers');

class SolidityGPT {
  constructor() {
    this.model = null;
    this.modelName = 'microsoft/CodeBERT-base'; 
  }

  async initialize() {
    if (!this.model) {
      console.log('🤖 Loading SolidityGPT (first time may take 30 seconds)...');
      this.model = await pipeline('text-generation', this.modelName, {
        device: 'cpu',
        model_file_name: 'model_quantized.onnx'  
      });
    }
  }

  async generateSuggestions(functionCode, metadata = {}) {
    await this.initialize();

    const prompt = `// Solidity gas optimization
// Function: ${metadata.name || 'unknown'}
// Issues: ${metadata.patterns ? metadata.patterns.map(p => p.type).join(', ') : 'none'}

${functionCode}

// Optimizations:
// 1.`;

    try {
      const result = await this.model(prompt, {
        max_new_tokens: 100,
        temperature: 0.1,
        do_sample: true,
        num_return_sequences: 1
      });

      return this.parseOptimizations(result[0].generated_text);
    } catch (error) {
      throw new Error(`SolidityGPT error: ${error.message}`);
    }
  }

  parseOptimizations(text) {
    const suggestions = [];
    const lines = text.split('\n').filter(line => 
      line.includes('//') && 
      (line.includes('optimization') || line.includes('gas') || line.includes('save'))
    );

    lines.forEach(line => {
      const cleaned = line.replace(/\/\/\s*\d+\.\s*/, '').trim();
      if (cleaned.length > 10) {
        suggestions.push({
          type: 'ai_generated',
          message: cleaned,
          confidence: 0.8,
          impact: 'medium',
          source: 'solidityGPT'
        });
      }
    });

    return suggestions;
  }
}

module.exports = { SolidityGPT };
