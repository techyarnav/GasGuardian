const chalk = require('chalk');
const { createSpinner } = require('../utils/spinner');
const { GasAnalyzer } = require('../../core/analyzer');
const { table } = require('table');

async function analyze(files, options) {
  const spinner = createSpinner('Analyzing contracts with framework integration...').start();
  
  try {
    console.log(chalk.blue('🔍 Gas Guardian - Enhanced Contract Analysis'));
    console.log(chalk.gray(`Framework: ${options.framework}`));
    console.log(chalk.gray(`Files: ${files.join(', ')}`));
    
    const analyzer = new GasAnalyzer({
      framework: options.framework,
      projectRoot: process.cwd(),
      enableLLM: options.llm || false,
      llmOptions: {
        modelType: options.model || 'solidityGPT'
      }
    });
    
    const results = await analyzer.analyzeMultipleContracts(files, {
      enableLLM: options.llm
    });
    
    spinner.succeed('Analysis complete');
    
    // Display summary
    displaySummary(results.summary, results.framework);
    
    // Display individual contract results
    for (const result of results.contracts) {
      displayContractAnalysis(result, options);
    }
    
  } catch (error) {
    spinner.fail('Analysis failed');
    throw error;
  }
}

function displaySummary(summary, framework) {
  console.log(chalk.cyan('\n📊 Analysis Summary'));
  console.log(chalk.gray(`Framework: ${framework}`));
  console.log(chalk.gray(`Contracts: ${summary.totalContracts} | Functions: ${summary.totalFunctions}`));
  
  if (summary.totalGasUsage > 0) {
    console.log(chalk.green(`✅ Total Gas Usage: ${summary.totalGasUsage.toLocaleString()}`));
    console.log(chalk.yellow(`💰 Potential Savings: ${summary.totalPotentialSavings.toLocaleString()} gas (${summary.potentialSavingsPercentage}%)`));
    console.log(chalk.blue(`📈 Gas Data Coverage: ${summary.gasDataCoverage}%`));
  } else {
    console.log(chalk.yellow(`⚠️  No gas data available - run tests with ${framework} first`));
  }
}

function displayContractAnalysis(result, options) {
  console.log(chalk.cyan(`\n📄 Contract: ${result.name}`));
  console.log(chalk.gray(`Functions: ${result.functions.length} | Lines: ${result.totalLines}`));
  
  if (result.gasDataAvailable) {
    console.log(chalk.green(`✅ Real gas data available`));
    console.log(chalk.gray(`Total gas usage: ${result.totalGasUsage.toLocaleString()}`));
    if (result.totalPotentialSavings > 0) {
      console.log(chalk.yellow(`💰 Potential savings: ${result.totalPotentialSavings.toLocaleString()} gas`));
    }
  } else {
    console.log(chalk.yellow(`⚠️  No gas data - static analysis only`));
  }
  
  // Function breakdown
  if (options.output === 'table') {
    displayFunctionTable(result.functions);
  } else {
    displayFunctionList(result.functions);
  }
}

function displayFunctionTable(functions) {
  const data = [
    ['Function', 'Gas Usage', 'Rank', 'Suggestions', 'Potential Savings']
  ];
  
  functions.forEach(func => {
    data.push([
      func.name,
      func.gasUsage > 0 ? func.gasUsage.toLocaleString() : 'N/A',
      func.gasRank,
      func.suggestions.length.toString(),
      func.potentialSavings > 0 ? func.potentialSavings.toLocaleString() : '0'
    ]);
  });
  
  console.log(table(data));
}

function displayFunctionList(functions) {
  functions.forEach(func => {
    const gasInfo = func.gasUsage > 0 
      ? `${func.gasUsage.toLocaleString()} gas (${func.gasRank})`
      : 'No gas data';
      
    const savingsInfo = func.potentialSavings > 0 
      ? ` | Savings: ${func.potentialSavings.toLocaleString()}`
      : '';
      
    console.log(`  📝 ${func.name} | ${gasInfo}${savingsInfo}`);
    
    if (func.suggestions && func.suggestions.length > 0) {
      console.log(chalk.gray(`     Suggestions: ${func.suggestions.length} optimization(s) available`));
    }
  });
}

module.exports = { analyze };
