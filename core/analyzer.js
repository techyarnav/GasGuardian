const path = require('path');
const { parseContractFile } = require('./parser');
const { FoundryAdapter } = require('./adapters/foundry');
const { HardhatAdapter } = require('./adapters/hardhat');
const { SuggestionEngine } = require('./suggestor');

class GasAnalyzer {
    constructor(options = {}) {
        this.framework = options.framework || 'foundry';
        this.projectRoot = options.projectRoot || process.cwd();

        this.adapter = this.framework === 'foundry'
            ? new FoundryAdapter({ projectRoot: this.projectRoot })
            : new HardhatAdapter({ projectRoot: this.projectRoot });

        this.suggestor = new SuggestionEngine({
            enableLLM: options.enableLLM || false,
            llmOptions: options.llmOptions || {}
        });
    }

    async analyzeContract(contractPath, options = {}) {
        try {
            console.log(`🔍 Analyzing contract: ${path.basename(contractPath)}`);

            // 1. Parse contract structure
            const contractInfo = await parseContractFile(contractPath);

            // 2. Get real gas data from framework
            let gasData = {};
            let gasDataAvailable = false;

            try {
                // For Hardhat, use the contract path to find the project root
                if (this.framework === 'hardhat') {
                    const hardhatRoot = await this.adapter.findHardhatProjectRoot(contractPath);
                    if (hardhatRoot) {
                        console.log(`📁 Found Hardhat project at: ${hardhatRoot}`);
                        // Update the adapter to use the correct project root
                        this.adapter.projectRoot = hardhatRoot;
                    }
                }

                // For Foundry, also update project root if needed
                if (this.framework === 'foundry') {
                    const foundryRoot = await this.adapter.findFoundryProjectRoot(contractPath);
                    if (foundryRoot) {
                        console.log(`📁 Found Foundry project at: ${foundryRoot}`);
                        this.adapter.projectRoot = foundryRoot;
                    }
                }

                // Check if we're in a project with the selected framework
                const isProjectType = await this.adapter[`is${this.framework.charAt(0).toUpperCase() + this.framework.slice(1)}Project`]();

                if (isProjectType) {
                    // Pass the contract path to the adapter
                    gasData = await this.adapter.getGasData(contractPath);
                    gasDataAvailable = Object.keys(gasData).length > 0;

                    if (gasDataAvailable) {
                        console.log(`📊 Loaded gas data for ${Object.keys(gasData).length} functions from ${this.framework}`);
                    }
                } else {
                    console.log(`⚠️  Not a ${this.framework} project, using static analysis only`);
                }
            } catch (error) {
                console.warn(`⚠️  Could not load ${this.framework} gas data:`, error.message);
                console.log('💡 Continuing with static analysis only');
            }

            // 3. Enrich functions with gas data and suggestions
            const enrichedFunctions = await Promise.all(
                contractInfo.functions.map(async (func) => {
                    const gasUsage = gasData[func.name.toLowerCase()] || 0;

                    if (options.debug) {
                        console.log(`🐛 Debug - Function: ${func.name} -> Looking for: ${func.name.toLowerCase()} -> Found gas: ${gasUsage}`);
                        console.log(`🐛 Debug - Available gas data keys:`, Object.keys(gasData));
                    }

                    const suggestions = await this.suggestor.generateSuggestions(func, {
                        enableLLM: options.enableLLM
                    });

                    const potentialSavings = this.calculatePotentialSavings(suggestions, gasUsage);

                    return {
                        ...func,
                        gasUsage,
                        gasRank: this.calculateGasRank(gasUsage),
                        hasGasData: gasUsage > 0,
                        suggestions: suggestions || [],
                        potentialSavings
                    };
                })
            );

            // 4. Calculate final summary values
            const totalGasUsage = enrichedFunctions.reduce((sum, func) => sum + func.gasUsage, 0);
            const finalGasDataAvailable = totalGasUsage > 0;

            if (options.debug) {
                console.log(`🐛 Debug - Total gas usage: ${totalGasUsage}, Gas data available: ${finalGasDataAvailable}`);
            }

            return {
                ...contractInfo,
                functions: enrichedFunctions,
                totalGasUsage,
                frameworkUsed: this.framework,
                gasDataAvailable: finalGasDataAvailable,
                analysisTimestamp: new Date().toISOString(),
                totalPotentialSavings: enrichedFunctions.reduce((sum, func) => sum + func.potentialSavings, 0)
            };

        } catch (error) {
            throw new Error(`Contract analysis failed: ${error.message}`);
        }
    }

    calculateGasRank(gasUsage) {
        if (gasUsage === 0) return 'unknown';
        if (gasUsage < 30000) return 'low';
        if (gasUsage < 100000) return 'medium';
        return 'high';
    }

    calculatePotentialSavings(suggestions, currentGasUsage) {
        if (!suggestions || suggestions.length === 0) return 0;

        let totalSavings = 0;

        // If we have real gas usage, calculate percentage-based savings
        if (currentGasUsage && currentGasUsage > 0) {
            suggestions.forEach(suggestion => {
                switch (suggestion.impact) {
                    case 'high':
                        totalSavings += Math.floor(currentGasUsage * 0.15); // 15% savings
                        break;
                    case 'medium':
                        totalSavings += Math.floor(currentGasUsage * 0.08); // 8% savings
                        break;
                    case 'low':
                        totalSavings += Math.floor(currentGasUsage * 0.03); // 3% savings
                        break;
                    default:
                        totalSavings += 100; // Flat 100 gas savings
                }
            });
        } else {
            // Fallback: Use estimated gas savings based on suggestion types
            suggestions.forEach(suggestion => {
                switch (suggestion.impact) {
                    case 'high':
                        totalSavings += 15000; // High impact: ~15k gas savings
                        break;
                    case 'medium':
                        totalSavings += 5000;  // Medium impact: ~5k gas savings
                        break;
                    case 'low':
                        totalSavings += 1000;  // Low impact: ~1k gas savings
                        break;
                    default:
                        totalSavings += 500;   // Default: 500 gas savings
                }
            });
        }

        return totalSavings;
    }

    async analyzeMultipleContracts(contractPaths, options = {}) {
        const results = [];

        for (const contractPath of contractPaths) {
            const analysis = await this.analyzeContract(contractPath, options);
            results.push(analysis);
        }

        return {
            contracts: results,
            summary: this.generateSummary(results),
            framework: this.framework,
            timestamp: new Date().toISOString()
        };
    }

    generateSummary(results) {
        const totalContracts = results.length;
        const totalFunctions = results.reduce((sum, contract) => sum + contract.functions.length, 0);
        const totalGasUsage = results.reduce((sum, contract) => sum + contract.totalGasUsage, 0);
        const totalPotentialSavings = results.reduce((sum, contract) => sum + contract.totalPotentialSavings, 0);
        const contractsWithGasData = results.filter(contract => contract.gasDataAvailable).length;

        return {
            totalContracts,
            totalFunctions,
            totalGasUsage,
            totalPotentialSavings,
            contractsWithGasData,
            gasDataCoverage: totalContracts > 0 ? Math.round((contractsWithGasData / totalContracts) * 100) : 0,
            averageGasPerFunction: totalFunctions > 0 ? Math.round(totalGasUsage / totalFunctions) : 0,
            potentialSavingsPercentage: totalGasUsage > 0 ? Math.round((totalPotentialSavings / totalGasUsage) * 100) : 0
        };
    }
}

module.exports = { GasAnalyzer };
