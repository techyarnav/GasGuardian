let nativeParser = null;

try {
  const nativeModule = require('../../build/Release/parser.node');
  
  if (nativeModule && nativeModule.parse) {
    nativeParser = nativeModule;
    console.log('✅ Using high-performance C++ parser');
  } else {
    console.warn('⚠️  C++ parser module loaded but parse function not found');
    console.warn('Available methods:', Object.keys(nativeModule || {}));
  }
} catch (error) {
  console.warn('⚠️  C++ parser not available, falling back to JavaScript parser');
  console.warn('Debug:', error.message);
}

class NativeSolidityParser {
  parseContract(source) {
    if (nativeParser) {
      try {
        const result = nativeParser.parse(source);
        return this.processResult(result);
      } catch (error) {
        console.warn('⚠️  C++ parser failed, falling back to JavaScript parser:', error.message);
        throw new Error(`Native parser error: ${error.message}`);
      }
    } else {
      throw new Error('Native parser not available');
    }
  }

  processResult(result) {
    if (result.functions) {
      result.functions = result.functions.map(func => ({
        ...func,
        parameters: func.parameters || [],
        patterns: func.patterns || [],
        visibility: func.visibility || 'public',
        stateMutability: func.stateMutability || 'nonpayable'
      }));
    }
    
    return {
      ...result,
      functions: result.functions || [],
      stateVariables: result.stateVariables || [],
      totalLines: result.totalLines || 0
    };
  }
}

module.exports = { NativeSolidityParser };
