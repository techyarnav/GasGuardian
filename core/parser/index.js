const fs = require('fs-extra');

// Try to load native parser, fallback to JavaScript parser
let parser;
let usingNative = false;

try {
  const { NativeSolidityParser } = require('./native-bindings');
  parser = new NativeSolidityParser();
  usingNative = true;
  console.log('✅ Using high-performance C++ parser');
} catch (error) {
  console.log('⚠️  C++ parser not available, falling back to JavaScript parser');
  
  // JavaScript fallback implementation with regex parsing
  parser = {
    parseContract: (source) => {
      try {
        return parseWithRegex(source);
      } catch (error) {
        throw new Error(`JavaScript parser error: ${error.message}`);
      }
    }
  };
}

function parseWithRegex(source) {
  const contract = {
    name: 'Unknown',
    functions: [],
    stateVariables: [],
    totalLines: source.split('\n').length
  };

  // Extract contract name
  const contractMatch = source.match(/contract\s+(\w+)/);
  if (contractMatch) {
    contract.name = contractMatch[1];
  }

  // Extract functions using regex with FULL source code
  const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*(?:(public|private|internal|external))?\s*(?:(pure|view|payable|nonpayable))?\s*(?:returns\s*\(([^)]*)\))?\s*\{/g;
  
  let match;
  while ((match = functionRegex.exec(source)) !== null) {
    const [fullMatch, name, params, visibility, stateMutability, returns] = match;
    
    // Calculate line number
    const beforeMatch = source.substring(0, match.index);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
    
    // Find function body to extract COMPLETE source code
    const startPos = match.index; // Start from function declaration
    const bracePos = match.index + fullMatch.length - 1; // Position of opening brace
    let braceCount = 1;
    let endPos = bracePos + 1;
    
    while (endPos < source.length && braceCount > 0) {
      if (source[endPos] === '{') braceCount++;
      else if (source[endPos] === '}') braceCount--;
      endPos++;
    }
    
    const functionSourceCode = source.substring(startPos, endPos); // COMPLETE function source
    
    // Parse parameters
    const parameters = [];
    if (params.trim()) {
      const paramMatches = params.matchAll(/\s*(\w+(?:\[\])?)\s+(\w+)/g);
      for (const paramMatch of paramMatches) {
        parameters.push({
          type: paramMatch[1],
          name: paramMatch[2]
        });
      }
    }

    // Detect patterns from function body
    const patterns = [];
    
    // Detect loops
    if (/\b(for|while)\s*\(/.test(functionSourceCode)) {
      patterns.push({
        type: 'loop',
        description: 'Loop detected - gas scales with iterations',
        estimatedGas: 5000,
        suggestion: 'Consider using fixed iterations or breaking into smaller chunks'
      });
    }
    
    // Detect storage writes
    const storageWrites = (functionSourceCode.match(/\w+\[\w*\]\s*=|^\s*\w+\s*=(?![=!])/gm) || []).length;
    if (storageWrites > 0) {
      patterns.push({
        type: 'storage_write',
        description: 'Storage write operations detected',
        estimatedGas: storageWrites * 20000,
        suggestion: 'Consider batching storage operations'
      });
    }
    
    // Detect external calls
    if (/\w+\.call\(|\w+\.delegatecall\(|\w+\.staticcall\(/.test(functionSourceCode)) {
      patterns.push({
        type: 'external_call',
        description: 'External call detected',
        estimatedGas: 2300,
        suggestion: 'Ensure proper gas estimation and consider reentrancy protection'
      });
    }

    // Detect require statements
    const requireCount = (functionSourceCode.match(/require\s*\(/g) || []).length;
    if (requireCount > 0) {
      patterns.push({
        type: 'validation',
        description: 'Input validation detected',
        estimatedGas: requireCount * 500,
        suggestion: 'Consider custom errors instead of require with strings'
      });
    }

    const func = {
      name: name,
      visibility: visibility || 'public',
      stateMutability: stateMutability || 'nonpayable',
      parameters: parameters,
      patterns: patterns,
      complexityScore: 1 + patterns.length * 2,
      startLine: lineNumber,
      sourceCode: functionSourceCode // ADD THIS - the complete function source code
    };
    
    contract.functions.push(func);
  }

  // Extract state variables
  const stateVarRegex = /\s*(uint256|uint|address|bool|string|mapping)\s+(?:public\s+|private\s+|internal\s+)?(\w+)/g;
  let varMatch;
  while ((varMatch = stateVarRegex.exec(source)) !== null) {
    contract.stateVariables.push(varMatch[2]);
  }

  return contract;
}

async function parseContractFile(filePath) {
  try {
    const source = await fs.readFile(filePath, 'utf8');
    
    // Basic validation
    if (!source.includes('contract') && !source.includes('interface') && !source.includes('library')) {
      console.warn(`⚠️  File ${filePath} doesn't appear to contain valid Solidity code`);
      return {
        name: 'InvalidContract',
        functions: [],
        stateVariables: [],
        totalLines: source.split('\n').length
      };
    }
    
    return parser.parseContract(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    } else if (error.message.includes('Parse error')) {
      throw new Error(`Invalid Solidity syntax in ${filePath}: ${error.message}`);
    } else {
      throw new Error(`Failed to parse ${filePath}: ${error.message}`);
    }
  }
}

async function extractFunctionsFromFile(filePath) {
  try {
    const contractInfo = await parseContractFile(filePath);
    return contractInfo.functions || [];
  } catch (error) {
    throw new Error(`Failed to extract functions from ${filePath}: ${error.message}`);
  }
}

module.exports = {
  parseContractFile,
  extractFunctionsFromFile,
  parseContract: parser.parseContract,
  isUsingNative: () => usingNative
};
