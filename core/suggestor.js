const { LLMEngine } = require('./llm/engine');
const staticRules = require('./rules/gasRules');
const path = require('path');
const os = require('os');

class SuggestionEngine {
    constructor(options = {}) {
        this.enableLLM = options.enableLLM || false;
        this.llmOptions = options.llmOptions || {};

        if (this.enableLLM) {
            this.llm = new LLMEngine({
                modelType: this.llmOptions.modelType || 'solidityGPT',
                cacheDir: path.join(os.homedir(), '.gas-guardian', 'cache'),
                maxTokens: this.llmOptions.maxTokens || 512,
                temperature: this.llmOptions.temperature || 0.1,
                ...this.llmOptions
            });
        }
    }

    async generateSuggestions(functionData, options = {}) {
        const suggestions = [];

        // 1. Apply static rule-based suggestions
        const staticSuggestions = staticRules.analyze(functionData);
        suggestions.push(...staticSuggestions);

        // 2. Generate LLM-powered suggestions if enabled
        if (this.enableLLM && options.enableLLM) {
            try {
                console.log('🤖 Generating AI-powered suggestions...');

                // Debug: Check if sourceCode exists
                const functionCode = functionData.sourceCode || functionData.source || '';

                if (!functionCode) {
                    console.warn('⚠️  No function code available for LLM analysis');
                    console.log('Debug - functionData keys:', Object.keys(functionData));
                    return this.deduplicateAndRank(suggestions);
                }

                const llmResult = await this.llm.generateOptimizationSuggestions(
                    functionCode,
                    functionData
                );

                if (llmResult.suggestions.length > 0) {
                    suggestions.push(...llmResult.suggestions.map(s => ({
                        ...s,
                        source: 'llm',
                        fromCache: llmResult.fromCache
                    })));

                    function safeLog(message) {
                        try {
                            if (process.stdout.writable) {
                                console.log(message);
                            }
                        } catch (error) {
                            // Ignore EPIPE errors silently
                            if (error.code !== 'EPIPE') {
                                throw error;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️  LLM suggestions failed:', error.message);
            }
        }

        // 3. Deduplicate and rank suggestions
        return this.deduplicateAndRank(suggestions);
    }

    deduplicateAndRank(suggestions) {
        // Remove duplicates based on message similarity
        const unique = suggestions.filter((suggestion, index, array) => {
            return !array.slice(0, index).some(prev =>
                this.areSimilar(suggestion.message, prev.message)
            );
        });

        // Sort by impact and confidence
        return unique.sort((a, b) => {
            const impactOrder = { high: 3, medium: 2, low: 1 };
            const aScore = (impactOrder[a.impact] || 1) * (a.confidence || 0.5);
            const bScore = (impactOrder[b.impact] || 1) * (b.confidence || 0.5);
            return bScore - aScore;
        });
    }

    areSimilar(text1, text2, threshold = 0.7) {
        // Simple similarity check based on common words
        const words1 = text1.toLowerCase().split(/\W+/);
        const words2 = text2.toLowerCase().split(/\W+/);
        const common = words1.filter(word => words2.includes(word)).length;
        const total = Math.max(words1.length, words2.length);
        return common / total > threshold;
    }
}

module.exports = { SuggestionEngine };
