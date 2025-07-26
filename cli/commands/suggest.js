const chalk = require('chalk');
const { createSpinner } = require('../utils/spinner');
const { parseContractFile } = require('../../core/parser');
const { SuggestionEngine } = require('../../core/suggestor');

async function suggest(files, options) {
    const spinner = createSpinner('Analyzing contracts and generating suggestions...').start();

    try {
        console.log(chalk.blue('\n💡 Gas Guardian - Optimization Suggestions'));
        console.log(chalk.gray(`LLM enabled: ${options.llm ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`Files: ${files.join(', ')}`));

        // Create suggestion engine ONCE at the top level
        const suggestor = new SuggestionEngine({
            enableLLM: options.llm,
            llmOptions: {
                modelType: options.model || 'solidityGPT',
                maxTokens: 512,
                temperature: 0.1
            }
        });

        for (const file of files) {
            spinner.stop();
            console.log(chalk.cyan(`\n📄 Analyzing: ${file}`));

            const contractInfo = await parseContractFile(file);

            for (const func of contractInfo.functions) {
                console.log(chalk.yellow(`\n🔍 Function: ${func.name}`));
                console.log(chalk.gray(`   Visibility: ${func.visibility} | Complexity: ${func.complexityScore}`));

                if (func.patterns && func.patterns.length > 0) {
                    console.log(chalk.gray(`   Patterns: ${func.patterns.map(p => p.type).join(', ')}`));
                }

                // Add debug logging for function data
                if (options.debug) {
                    console.log(chalk.gray(`   Debug - Function data:`, {
                        hasSourceCode: !!func.sourceCode,
                        hasSource: !!func.source,
                        keys: Object.keys(func),
                        sourceCodeLength: func.sourceCode ? func.sourceCode.length : 'N/A'
                    }));
                }
                process.stdout.on('error', (err) => {
                    if (err.code === 'EPIPE') {
                        process.exit(0);
                    }
                    throw err;
                });

                process.on('SIGPIPE', () => {
                    process.exit(0);
                });
                try {
                    const suggestions = await suggestor.generateSuggestions(func, {
                        enableLLM: options.llm
                    });

                    if (suggestions.length === 0) {
                        console.log(chalk.green('   ✅ No optimization suggestions - function appears optimal'));
                    } else {
                        suggestions.forEach((suggestion, index) => {
                            const icon = suggestion.impact === 'high' ? '🔥' : suggestion.impact === 'medium' ? '⚡' : '💡';
                            const source = suggestion.source === 'llm' ? '🤖' : '🔧';

                            console.log(`   ${icon} ${source} ${suggestion.message}`);
                            if (suggestion.impact && suggestion.confidence) {
                                console.log(chalk.gray(`      Impact: ${suggestion.impact} | Confidence: ${Math.round(suggestion.confidence * 100)}%`));
                            }
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️  SolidityGPT suggestions failed: ${error.message}`);
                    console.warn('   Continuing with static analysis...');
                }
            }
        }

        console.log(chalk.green('\n✅ Analysis complete!'));

    } catch (error) {
        spinner.fail('Suggestion generation failed');
        console.error(chalk.red('Error:'), error.message);
        throw error;
    }
}

module.exports = { suggest };
