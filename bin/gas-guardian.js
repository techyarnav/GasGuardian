#!/usr/bin/env node

const { program } = require('commander');
const pkg = require('../package.json');

program
  .name('gas-guardian')
  .description('Solidity gas usage analyzer and optimizer with real-time suggestions')
  .version(pkg.version);

program
  .command('analyze')
  .description('Analyze contracts for gas optimization opportunities')
  .argument('<files...>', 'Contract files to analyze')
  .option('--framework <type>', 'Testing framework (foundry|hardhat)', 'foundry')
  .option('--output <format>', 'Output format (table|markdown)', 'table')
  .option('--llm', 'Enable AI suggestions', false)
  .option('--model <type>', 'AI model (solidityGPT)', 'solidityGPT')
  .option('--debug', 'Enable debug output', false)
  .action(async (files, options) => {
    const { analyze } = require('../cli/commands/analyze');
    await analyze(files, options);
  });

program
  .command('suggest')
  .description('Generate real-time gas optimization suggestions')
  .argument('<files...>', 'Contract files to analyze')
  .option('--llm', 'Enable AI suggestions', false)
  .option('--model <type>', 'AI model (solidityGPT)', 'solidityGPT')
  .option('--framework <type>', 'Testing framework (foundry|hardhat)', 'foundry')
  .option('--output <format>', 'Output format (table|markdown)', 'table')
  .action(async (files, options) => {
    const { suggest } = require('../cli/commands/suggest');
    await suggest(files, options);
  });

program
  .command('report')
  .description('Generate comprehensive gas analysis report')
  .argument('<files...>', 'Contract files to analyze')
  .option('--framework <type>', 'Testing framework (foundry|hardhat)', 'foundry')
  .option('--output <path>', 'Output file path')
  .option('--format <type>', 'Report format (markdown|json)', 'markdown')
  .option('--llm', 'Include SolidityGPT suggestions in report', false)
  .action(async (files, options) => {
    const { report } = require('../cli/commands/report');
    await report(files, options);
  });

// Global error handling
process.on('unhandledRejection', (error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

program.parse();
