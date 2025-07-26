const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { GasAnalyzer } = require('../../core/analyzer');
const { createSpinner } = require('../utils/spinner');

async function report(files, options) {
  const spinner = createSpinner('Generating comprehensive gas analysis report...').start();
  
  try {
    console.log(chalk.blue('📊 Gas Guardian - Report Generation'));
    console.log(chalk.gray(`Format: ${options.format}`));
    console.log(chalk.gray(`Output: ${options.output || 'stdout'}`));
    
    const analyzer = new GasAnalyzer({
      framework: options.framework,
      projectRoot: process.cwd(),
      enableLLM: options.llm || false,
      llmOptions: {
        modelType: 'solidityGPT'
      }
    });
    
    const results = await analyzer.analyzeMultipleContracts(files, {
      enableLLM: options.llm
    });
    
    const report = generateReport(results, options.format);
    
    if (options.output) {
      await fs.writeFile(options.output, report);
      spinner.succeed(`Report saved to ${options.output}`);
    } else {
      spinner.succeed('Report generated');
      console.log('\n' + report);
    }
    
  } catch (error) {
    spinner.fail('Report generation failed');
    throw error;
  }
}

function generateReport(results, format) {
  if (format === 'json') {
    return JSON.stringify(results, null, 2);
  }
  
  // Markdown format
  let report = '# Gas Guardian Analysis Report\n\n';
  
  report += `## Summary\n`;
  report += `- **Framework**: ${results.framework}\n`;
  report += `- **Contracts**: ${results.summary.totalContracts}\n`;
  report += `- **Functions**: ${results.summary.totalFunctions}\n`;
  report += `- **Total Gas Usage**: ${results.summary.totalGasUsage.toLocaleString()}\n`;
  report += `- **Potential Savings**: ${results.summary.totalPotentialSavings.toLocaleString()} gas (${results.summary.potentialSavingsPercentage}%)\n\n`;
  
  for (const contract of results.contracts) {
    report += `## Contract: ${contract.name}\n\n`;
    report += `- **Functions**: ${contract.functions.length}\n`;
    report += `- **Lines**: ${contract.totalLines}\n`;
    report += `- **Gas Data Available**: ${contract.gasDataAvailable ? 'Yes' : 'No'}\n\n`;
    
    if (contract.functions.length > 0) {
      report += `### Functions\n\n`;
      report += `| Function | Gas Usage | Rank | Suggestions | Potential Savings |\n`;
      report += `|----------|-----------|------|-------------|------------------|\n`;
      
      contract.functions.forEach(func => {
        const gasUsage = func.gasUsage > 0 ? func.gasUsage.toLocaleString() : 'N/A';
        const savings = func.potentialSavings > 0 ? func.potentialSavings.toLocaleString() : '0';
        
        report += `| ${func.name} | ${gasUsage} | ${func.gasRank} | ${func.suggestions.length} | ${savings} |\n`;
      });
      
      report += '\n';
    }
  }
  
  return report;
}

module.exports = { report };
