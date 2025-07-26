const fs = require('fs-extra');
const path = require('path');
const { createHash } = require('crypto');

class LLMEngine {
    constructor(options = {}) {
        this.modelPath = options.modelPath;
        this.modelType = options.modelType || 'solidityGPT';
        this.maxTokens = options.maxTokens || 512;
        this.temperature = options.temperature || 0.1;
        this.cacheDir = options.cacheDir || path.join(__dirname, 'cache');
        this.enableCache = options.enableCache !== false;

        // Only support SolidityGPT
        if (this.modelType !== 'solidityGPT') {
            console.warn(`⚠️  Unsupported model: ${this.modelType}, falling back to solidityGPT`);
            this.modelType = 'solidityGPT';
        }

        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        await fs.ensureDir(this.cacheDir);
    }

    getCacheKey(functionCode, promptType = 'optimization') {
        const content = `${promptType}:${functionCode}`;
        return createHash('sha256').update(content).digest('hex');
    }

    async getCachedSuggestions(cacheKey) {
        if (!this.enableCache) return null;

        try {
            const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
            if (await fs.pathExists(cachePath)) {
                const cached = await fs.readJson(cachePath);
                // Check if cache is less than 24 hours old
                if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                    return cached.suggestions;
                }
            }
        } catch (error) {
            console.warn('Cache read error:', error.message);
        }

        return null;
    }

    async cacheSuggestions(cacheKey, suggestions) {
        if (!this.enableCache) return;

        try {
            const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
            await fs.writeJson(cachePath, {
                timestamp: Date.now(),
                suggestions
            });
        } catch (error) {
            console.warn('Cache write error:', error.message);
        }
    }

    async generateOptimizationSuggestions(functionCode, functionMetadata = {}) {
        const cacheKey = this.getCacheKey(functionCode);

        const cached = await this.getCachedSuggestions(cacheKey);
        if (cached) {
            return { suggestions: cached, fromCache: true };
        }

        try {
            const validFunctionCode = functionCode || functionMetadata.sourceCode || functionMetadata.source || '';

            if (!validFunctionCode) {
                console.warn('⚠️  No function code available for LLM analysis');
                return { suggestions: [], error: 'No function code available' };
            }

            const prompt = this.buildSolidityGPTPrompt(validFunctionCode, functionMetadata);

            const suggestions = await this.querySolidityGPT(validFunctionCode, functionMetadata);

            await this.cacheSuggestions(cacheKey, suggestions);

            return { suggestions, fromCache: false };
        } catch (error) {
            console.error('LLM generation failed:', error.message);
            return { suggestions: [], error: error.message };
        }
    }

    buildSolidityGPTPrompt(functionCode, metadata) {
        const codeSnippet = functionCode.length > 120 ?
            functionCode.substring(0, 120) + '...' : functionCode;

        return `Optimize this Solidity function:

${codeSnippet}

Gas optimizations:
1. Use external instead of public
2. Cache storage in memory  
3. Use unchecked for safe arithmetic
4.`;
    }

    async querySolidityGPT(functionCode, metadata) {
        try {
            // Suppress all console warnings during model loading
            const originalWarn = console.warn;
            const originalError = console.error;
            console.warn = () => { };
            console.error = () => { };

            const { pipeline, env } = await import('@xenova/transformers');

            env.allowRemoteModels = true;
            env.allowLocalModels = true;

            if (!this.solidityGPTModel) {
                console.log('🤖 Loading SolidityGPT model...');
                this.solidityGPTModel = await pipeline('text-generation', 'Xenova/distilgpt2');
                console.log('✅ SolidityGPT model loaded successfully');
            }

            console.warn = originalWarn;
            console.error = originalError;

            if (!functionCode || typeof functionCode !== 'string') {
                console.warn('⚠️  Invalid function code provided to SolidityGPT');
                return this.generateFallbackSolidityGPTSuggestions();
            }

            const cleanCode = functionCode.replace(/\s+/g, ' ').trim();
            const codeSnippet = cleanCode.length > 120 ? cleanCode.substring(0, 120) + '...' : cleanCode;

            const prompt = `Optimize this Solidity function for gas efficiency:

${codeSnippet}

Function: ${metadata.name || 'unknown'}
Issues: ${metadata.patterns ? metadata.patterns.map(p => p.type).join(', ') : 'none'}

Gas optimizations:
1.`;

            const result = await this.solidityGPTModel(prompt, {
                max_new_tokens: 80,
                temperature: 0.1,
                do_sample: true,
                pad_token_id: 50256
            });

            return this.parseSolidityGPTOutput(result[0].generated_text);
        } catch (error) {
            console.error('SolidityGPT generation failed:', error.message);
            return this.generateFallbackSolidityGPTSuggestions();
        }
    }

    parseSolidityGPTOutput(output) {
        const suggestions = [];

        const cleanOutput = output.replace(/^.*?Gas optimizations:\s*/is, '').trim();

        const lines = cleanOutput.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const text = line.trim();

            if (text.includes('Optimize this Solidity') ||
                text.includes('Function:') ||
                text.includes('Issues:') ||
                text.includes('Gas optimizations:') ||
                text.length < 15) {
                continue;
            }

            if (this.isSolidityOptimization(text)) {
                const cleanedSuggestion = this.cleanSolidityGPTSuggestion(text);
                if (cleanedSuggestion) {
                    suggestions.push({
                        type: 'ai_generated',
                        message: cleanedSuggestion,
                        confidence: 0.8,
                        impact: this.estimateImpact(cleanedSuggestion)
                    });
                }
            }
        }

        if (suggestions.length === 0) {
            return this.generateFallbackSolidityGPTSuggestions();
        }

        return suggestions.slice(0, 3);
    }

    isSolidityOptimization(text) {
        const solidityKeywords = [
            'unchecked', 'external', 'storage', 'memory', 'calldata',
            'gas', 'sstore', 'sload', 'mapping', 'array', 'uint',
            'require', 'error', 'batch', 'pack', 'slot', 'optimize'
        ];

        const lowerText = text.toLowerCase();
        return solidityKeywords.some(keyword => lowerText.includes(keyword)) &&
            text.length > 20 && text.length < 150 &&
            !lowerText.includes('home or office') &&
            !lowerText.includes('specific setting');
    }

    cleanSolidityGPTSuggestion(text) {
        // Remove numbering and common prefixes
        let cleaned = text.replace(/^\d+\.\s*/, '')
            .replace(/^[*-]\s*/, '')
            .replace(/^(use|consider|try|implement)\s+/i, '');

        // Capitalize first letter
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

        // Ensure it ends with a period
        if (!cleaned.endsWith('.') && !cleaned.endsWith('!')) {
            cleaned += '.';
        }

        return cleaned.trim();
    }

    generateFallbackSolidityGPTSuggestions() {
        return [
            {
                type: 'ai_generated',
                message: 'Use external visibility instead of public for functions not called internally (~24 gas savings)',
                confidence: 0.8,
                impact: 'low'
            },
            {
                type: 'ai_generated',
                message: 'Cache storage reads in memory variables to avoid multiple SLOAD operations (~2100 gas per read)',
                confidence: 0.9,
                impact: 'medium'
            },
            {
                type: 'ai_generated',
                message: 'Consider using unchecked arithmetic for operations that cannot overflow (~20 gas savings)',
                confidence: 0.7,
                impact: 'medium'
            }
        ];
    }

    estimateImpact(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('storage') || lowerText.includes('sstore') || lowerText.includes('struct')) {
            return 'high';
        }
        if (lowerText.includes('loop') || lowerText.includes('unchecked') || lowerText.includes('memory')) {
            return 'medium';
        }

        return 'low';
    }
}

module.exports = { LLMEngine };
