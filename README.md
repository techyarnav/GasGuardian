
<div align="center">

# 🛡️ GasGuardian

**Advanced Solidity Gas Optimization Analyzer with AI-Powered Suggestions**

[![npm version](https://badge.fury.io/js/gas-guardian.svg)](https://badge.fury.io/js/gas-guardian)
[![Node.js Version](https://img.shields.io/node/v/gas-guardian.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


*Optimize your Solidity smart contracts with AI-powered gas analysis and real-time suggestions*

[🚀 **Install**](#-installation) • [📖 **Docs**](#-usage) • [🏗️ **Architecture**](#-architecture) • [🧪 **Examples**](#-examples) • [🤝 **Contributing**](#-contributing)

</div>

---

## 🌟 **Features**

- 🔥 **High-Performance C++ Parser** - Lightning-fast Solidity contract analysis
- 🤖 **SolidityGPT Integration** - AI-powered optimization suggestions with context awareness
- ⚡ **Framework Integration** - Native support for Foundry and Hardhat projects
- 📊 **Real Gas Analysis** - Extract actual gas usage from test runs and snapshots
- 📈 **Multiple Output Formats** - Table, Markdown, JSON outputs for different workflows
- 🎯 **Advanced Pattern Detection** - Identify loops, storage operations, validation patterns
- 💰 **Cost Estimation** - Calculate potential gas savings with optimization recommendations
- 🔧 **CLI & Programmatic** - Use via command line or integrate into your development workflow

---
## 🛠️ **Tech Stack**

<div align="center">

### **Core Technologies**

| **Frontend** | **Backend** | **AI/ML** | **Build Tools** |
|:------------:|:-----------:|:---------:|:---------------:|
| ![CLI](https://img.shields.io/badge/CLI-Commander.js-blue?style=flat-square) | ![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square) | ![AI](https://img.shields.io/badge/AI-SolidityGPT-purple?style=flat-square) | ![C++](https://img.shields.io/badge/Parser-C%2B%2B17-red?style=flat-square) |
| Terminal UI | JavaScript Engine | Transformers.js | Native Compilation |

</div>

---
## 🚀 **Installation**

### **Global Installation (Recommended)**
~~~
npm install -g gas-guardian
~~~

### **Project Installation**
~~~
npm install gas-guardian --save-dev
~~~



### **Requirements**
- **Node.js** ≥ 18.0.0
- **npm** ≥ 8.0.0
- **C++ Compiler** (for native parser)
- **Foundry** or **Hardhat** (optional, for framework integration)

---

## 📖 **Usage**

### **Quick Start**

- Analyze a Solidity contract
~~~
gas-guardian suggest MyContract.sol
~~~

- Get AI-powered suggestions
~~~
gas-guardian suggest MyContract.sol --llm --model solidityGPT
~~~
- Framework integration with gas data
~~~
gas-guardian analyze MyContract.sol --framework foundry --output table
~~~
#


## **Command Reference**

#### **`suggest` - Get Optimization Suggestions**
~~~
gas-guardian suggest <files...> [options]
~~~
~~~
Options:
--llm Enable AI-powered suggestions
--model <type> AI model to use (solidityGPT)
--framework <type> Framework integration (foundry|hardhat)
--output <format> Output format (table|markdown)
~~~


#### **`analyze` - Comprehensive Analysis**
~~~
gas-guardian analyze <files...> [options]
~~~
~~~
Options:
--framework <type> Testing framework (foundry|hardhat)
--output <format> Output format (table|markdown|json)
--llm Enable AI suggestions
--model <type> AI model (solidityGPT)
--debug Enable debug output
~~~


#### **`report` - Generate Reports**
~~~
gas-guardian report <files...> [options]
~~~
~~~
Options:
--format <type> Report format (markdown|json)
--output <path> Output file path
--llm Include AI suggestions
~~~


---

## 🧪 **Examples**

### **Example 1: Basic Analysis**
~~~
gas-guardian suggest contracts/Token.sol
~~~


**Output:**
~~~
💡 Gas Guardian - Optimization Suggestions
LLM enabled: No
Files: contracts/Token.sol

📄 Analyzing: contracts/Token.sol

🔍 Function: transfer
Visibility: public | Complexity: 3
Patterns: validation
💡 🔧 Consider using "external" instead of "public" if function is only called externally.
Impact: low | Confidence: 60%

🔍 Function: batchTransfer
Visibility: external | Complexity: 7
Patterns: loop, storage_write, array_operation
⚡ 🔧 Loop detected. Consider using unchecked arithmetic for counters and caching array length.
Impact: medium | Confidence: 90%
⚡ 🔧 Multiple storage reads detected. Cache storage values in memory variables.
Impact: medium | Confidence: 70%

✅ Analysis complete!
~~~


### **Example 2: AI-Powered Analysis**
~~~
gas-guardian suggest contracts/Token.sol --llm --model solidityGPT
~~~


**Output:**
~~~
💡 Gas Guardian - Optimization Suggestions
LLM enabled: Yes
Files: contracts/Token.sol

📄 Analyzing: contracts/Token.sol

🔍 Function: batchTransfer
Visibility: external | Complexity: 7
Patterns: loop, storage_write, array_operation
🤖 Generating AI-powered suggestions...
⚡ 🤖 Cache storage reads in memory variables to avoid multiple SLOAD operations (~2100 gas per read)
Impact: medium | Confidence: 90%
⚡ 🤖 Use unchecked{++i} for loop counter increments to save ~50 gas per iteration
Impact: medium | Confidence: 95%
🔥 🤖 Pack struct variables to use fewer storage slots (uint128 instead of uint256 when possible)
Impact: high | Confidence: 80%

✅ Analysis complete!
~~~


### **Example 3: Framework Integration**
~~~
gas-guardian analyze contracts/Token.sol --framework foundry --output table
~~~


**Output:**
~~~
🔍 Gas Guardian - Enhanced Contract Analysis
Framework: foundry
Files: contracts/Token.sol

📊 Analysis Summary
Framework: foundry
Contracts: 1 | Functions: 4
✅ Total Gas Usage: 234,567
💰 Potential Savings: 31,245 gas (13%)
📈 Gas Data Coverage: 100%

| Function       | Gas Usage | Rank   | Suggestions | Potential Savings |
|----------------|-----------|--------|-------------|-------------------|
| `transfer`     | 51,477    | Medium | 2           | 3,000             |
| `batchTransfer`| 91,770    | High   | 5           | 28,245            |
| `mint`         | 68,269    | Medium | 1           | 0                 |
| `approve`      | 23,051    | Low    | 1           | 0                 |

~~~


### **Example 4: Comprehensive Report**

~~~
gas-guardian report contracts/Token.sol --format markdown --llm > gas-report.md
~~~


**Generated Report:**
~~~
Gas Guardian Analysis Report
Summary
Framework: foundry

Contracts: 1

Functions: 4

Total Gas Usage: 234,567

Potential Savings: 31,245 gas (13%)

Contract: Token

Functions

| Function        | Gas Usage | Rank   | Suggestions | Potential Savings |
|-----------------|-----------|--------|-------------|-------------------|
| `transfer`      | 51,477    | Medium | 2           | 3,000             |
| `batchTransfer` | 91,770    | High   | 5           | 28,245            |
| `mint`          | 68,269    | Medium | 1           | 0                 |
| `approve`       | 23,051    | Low    | 1           | 0                 |

AI Recommendations --> 

- Use unchecked arithmetic in loops - Save ~50 gas per iteration

- Cache storage reads in memory - Save ~2,100 gas per cached read

- Pack struct variables - Save ~20,000 gas per optimized slot

~~~

---

## 🏗️ **Architecture**
~~~

┌─────────────────────────────────────────────────────────────────┐
│                        GasGuardian CLI                          │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Commands: suggest | analyze | report                         │
│ 🔧 Options: --llm, --framework, --output, --model               │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Analysis Engine                         │
├─────────────────────────────────────────────────────────────────┤
│ 🔥 High-Performance C++ Parser                                  │
│ 🤖 SolidityGPT AI Integration                                   │
│ 📊 Pattern Detection & Analysis                                 │
│ 💰 Gas Estimation & Optimization                                │
└─────────────────────────────────────────────────────────────────┘
             │                                      │
             ▼                                      ▼
┌─────────────────────────────┐    ┌──────────────────────────────┐
│       Framework Adapters    │    │          AI Engine           │
├─────────────────────────────┤    ├──────────────────────────────┤
│ ⚒️ Foundry Integration      │    │ 🤖 SolidityGPT Model          │
│ 🔨 Hardhat Integration      │    │ 💭 Suggestion Generation      │
│ 📊 Gas Data Extraction      │    │ 🧠 Pattern Recognition        │
│ 📈 Test Report Parsing      │    │ 📝 Context-Aware Analysis     │
└─────────────────────────────┘    └──────────────────────────────┘
             │                                      │
             ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Output Formatters                         │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Table Format │ 📝 Markdown │ 🔗 JSON API                      │
│ 🎨 Themed CLI Interface  │ 📄 Reports  │ 📈 Structured Data      │
└─────────────────────────────────────────────────────────────────┘


~~~
#
## **Core Components**

#### **🔥 High-Performance Parser**
- **Native C++ Implementation** - 10x faster than JavaScript alternatives
- **Complete AST Generation** - Full Solidity syntax support
- **Pattern Detection** - Automatic identification of gas-heavy operations
- **Source Code Mapping** - Precise line-by-line analysis

#### **🤖 AI Integration**
- **SolidityGPT Model** - Specialized for Solidity optimization
- **Context-Aware Suggestions** - Understands contract patterns and intent
- **Confidence Scoring** - Reliability metrics for each suggestion
- **Caching System** - Fast repeated analysis with intelligent caching

#### **⚒️ Framework Adapters**
- **Foundry Integration** - Gas snapshots, forge test integration
- **Hardhat Integration** - Gas reporter, test output parsing
- **Automatic Detection** - Smart project type identification
- **Real Gas Data** - Extract actual gas usage from test runs

---

## 🧪 **Testing**

Gas Guardian includes comprehensive test suites to ensure reliability:

### **Run All Tests**
~~~
npm test                    # Unit and integration tests
npm run test:frameworks     # Framework integration tests
~~~


### **Test Categories**

 **Unit Tests** (29 tests)
~~~
npm run test:unit
~~~

- Core parser functionality
- AI engine integration
- CLI command testing
- Framework adapter logic

#### **Integration Tests** (5 tests)
~~~
npm run test:integration
~~~

- End-to-end CLI workflows
- Multi-contract analysis
- Error handling verification

#### **Framework Tests** (8 tests)
~~~
npm run test:foundry    # Foundry integration (2 tests)
npm run test:hardhat    # Hardhat integration (6 tests)
~~~

- Real project integration
- Gas data extraction
- Test report parsing

### **Test Results Example**

~~~
Test Suites: 7 passed, 7 total
Tests: 42 passed, 42 total
Snapshots: 0 total
Time: 4.2s
Coverage: 92% statements, 89% branches, 94% functions, 91% lines
~~~


---
## 🔧 **Development**

### **Local Development Setup**

- Clone the repository
~~~
git clone https://github.com/techyarnav/GasGuardian.git
cd GasGuardian
~~~

- Install dependencies
~~~
npm install
~~~
- Build native components
~~~
npm run build
~~~
- Run tests
~~~
npm test
~~~
- Link for local testing
~~~
npm link
gas-guardian --version
~~~

---
### **Build Commands**
~~~
npm run build           # Build C++ native parser
npm run build:native    # Rebuild native components
~~~

---
### **Debug Mode**
~~~
gas-guardian analyze Contract.sol --debug
~~~


Enables:
- Detailed parsing information
- AI model decision logging
- Framework detection details
- Performance timing data

---

## 📚 **API Reference**

Gas Guardian can also be used programmatically:
~~~
const { GasAnalyzer } = require('gas-guardian');

// Create analyzer instance
const analyzer = new GasAnalyzer({
framework: 'foundry',
enableLLM: true,
llmOptions: { modelType: 'solidityGPT' }
});

// Analyze contracts
const results = await analyzer.analyzeMultipleContracts([
'contracts/Token.sol',
'contracts/NFT.sol'
]);
~~~
~~~
console.log(`Total gas usage: ${results.summary.totalGasUsage}`);
console.log(`Potential savings: ${results.summary.totalPotentialSavings}`);

~~~

---

## 🎯 **Use Cases**

### **For Developers**
- **Pre-deployment optimization** - Identify gas issues before mainnet
- **Code review assistance** - Automated gas optimization suggestions
- **Learning tool** - Understand gas optimization patterns


### **For Auditors**
- **Security analysis** - Identify gas-related attack vectors
- **Efficiency assessment** - Evaluate contract gas performance
- **Report generation** - Professional audit documentation

---
## 🤝 Contributing - We welcome contributions! Follow the steps below

- Fork the repository

- Create your feature branch (git checkout -b feature/amazing-feature)

- Commit your changes (git commit -m 'Add features')

- Push to the branch (git push origin feature/amazing-feature)

- Open a Pull Request

#

### 📄 License

### This project is licensed under the MIT License - see the LICENSE file for details.


#


<div align="center">


**⚡ Optimize your Solidity contracts with AI-powered gas analysis!**

*Made with ❤️ and a bit of unchecked gasleft()*

</div>

---

<div align="center">
