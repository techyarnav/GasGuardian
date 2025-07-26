class GasRules {
  static analyze(functionData) {
    const suggestions = [];
    const code = functionData.sourceCode || functionData.source || '';
    const patterns = functionData.patterns || [];
    const functionName = functionData.name || 'unknown';
    
    // Enhanced storage optimization rules
    this.analyzeStorageOptimizations(code, patterns, suggestions);
    
    // Enhanced loop optimization rules
    this.analyzeLoopOptimizations(code, patterns, suggestions);
    
    // Function visibility and access patterns
    this.analyzeFunctionVisibility(functionData, code, suggestions);
    
    // State mutability analysis
    this.analyzeStateMutability(functionData, code, patterns, suggestions);
    
    // Gas-expensive operations
    this.analyzeExpensiveOperations(code, suggestions);
    
    // Variable optimization
    this.analyzeVariableOptimizations(code, suggestions);
    
    // Control flow optimizations
    this.analyzeControlFlowOptimizations(code, suggestions);
    
    // Advanced pattern-based optimizations
    this.analyzeAdvancedPatterns(code, functionName, suggestions);

    return suggestions;
  }

  static analyzeStorageOptimizations(code, patterns, suggestions) {
    // Rule 1: Multiple storage writes
    if (patterns.some(p => p.type === 'storage_write')) {
      const storageWrites = (code.match(/\w+\s*=\s*[^=!<>]|\w+\[\w*\]\s*=/g) || []).length;
      
      if (storageWrites > 3) {
        suggestions.push({
          type: 'storage',
          message: 'Multiple storage writes detected. Consider batching operations or using memory for intermediate calculations.',
          confidence: 0.8,
          impact: 'high',
          source: 'static',
          estimatedSaving: storageWrites * 5000
        });
      }
    }

    // Rule 2: Redundant storage reads
    const storageReads = (code.match(/\w+\[[\w\s]*\]/g) || []).length;
    if (storageReads > 2) {
      suggestions.push({
        type: 'storage',
        message: 'Multiple storage reads detected. Cache storage values in memory variables.',
        confidence: 0.7,
        impact: 'medium',
        source: 'static',
        estimatedSaving: (storageReads - 1) * 2100
      });
    }

    // Rule 3: Struct packing opportunities
    if (code.includes('struct') && code.includes('uint256')) {
      suggestions.push({
        type: 'storage',
        message: 'Consider packing struct variables to use fewer storage slots (uint128 instead of uint256 when possible).',
        confidence: 0.6,
        impact: 'high',
        source: 'static',
        estimatedSaving: 20000
      });
    }

    // Rule 4: Unnecessary storage initialization
    if (code.match(/\w+\s*=\s*0[^x\w]/) || code.match(/\w+\s*=\s*false/) || code.match(/\w+\s*=\s*""/)) {
      suggestions.push({
        type: 'storage',
        message: 'Avoid explicit initialization to default values (0, false, "") to save gas.',
        confidence: 0.9,
        impact: 'low',
        source: 'static',
        estimatedSaving: 2000
      });
    }
  }

  static analyzeLoopOptimizations(code, patterns, suggestions) {
    if (!patterns.some(p => p.type === 'loop')) return;

    // Rule 1: Basic loop optimization
    suggestions.push({
      type: 'loop',
      message: 'Loop detected. Consider using unchecked arithmetic for counters and caching array length.',
      confidence: 0.9,
      impact: 'medium',
      source: 'static',
      estimatedSaving: 5000
    });

    // Rule 2: Array length caching
    if (code.includes('.length') && (code.includes('for') || code.includes('while'))) {
      suggestions.push({
        type: 'loop',
        message: 'Cache array length before loop: uint256 len = array.length; for(uint256 i = 0; i < len;)',
        confidence: 0.85,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 3000
      });
    }

    // Rule 3: Loop variable increments
    if (code.includes('++') || code.includes('i + 1')) {
      suggestions.push({
        type: 'loop',
        message: 'Use unchecked{++i} for loop increments when overflow is impossible.',
        confidence: 0.9,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 2500
      });
    }

    // Rule 4: Nested loops warning
    const nestedLoops = (code.match(/for\s*\([^}]*for\s*\(/g) || []).length;
    if (nestedLoops > 0) {
      suggestions.push({
        type: 'loop',
        message: 'Nested loops detected. Consider alternative algorithms or breaking into separate functions.',
        confidence: 0.7,
        impact: 'high',
        source: 'static',
        estimatedSaving: 10000
      });
    }
  }

  static analyzeFunctionVisibility(functionData, code, suggestions) {
    // Rule 1: Public to external optimization
    if (functionData.visibility === 'public' && !this.isCalledInternally(code, functionData.name)) {
      suggestions.push({
        type: 'visibility',
        message: 'Consider using "external" instead of "public" if function is only called externally.',
        confidence: 0.6,
        impact: 'low',
        source: 'static',
        estimatedSaving: 1000
      });
    }

    // Rule 2: Function parameter optimization
    if (code.includes('calldata') === false && code.includes('memory') && functionData.visibility === 'external') {
      suggestions.push({
        type: 'visibility',
        message: 'Use "calldata" instead of "memory" for external function parameters.',
        confidence: 0.8,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 3000
      });
    }
  }

  static analyzeStateMutability(functionData, code, patterns, suggestions) {
    // Enhanced state mutability detection
    if (functionData.stateMutability === 'nonpayable' && 
        !this.hasStateChanges(code) && 
        !patterns.some(p => p.type === 'storage_write')) {
      
      const isPure = this.isPureFunction(code);
      const message = isPure 
        ? 'Function appears to be pure (no state reading). Consider marking as "pure".'
        : 'Function appears to be read-only. Consider marking as "view".';
      
      suggestions.push({
        type: 'mutability',
        message: message,
        confidence: 0.5,
        impact: 'low',
        source: 'static',
        estimatedSaving: 500
      });
    }
  }

  static analyzeExpensiveOperations(code, suggestions) {
    // Rule 1: Division operations
    if (code.includes('/') && !code.includes('//')) {
      suggestions.push({
        type: 'arithmetic',
        message: 'Division operations are expensive. Consider using bit shifting for powers of 2.',
        confidence: 0.6,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 1500
      });
    }

    // Rule 2: Modulo operations
    if (code.includes('%')) {
      suggestions.push({
        type: 'arithmetic',
        message: 'Modulo operations are expensive. Consider using bitwise AND for powers of 2.',
        confidence: 0.6,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 1200
      });
    }

    // Rule 3: String operations
    if (code.includes('string') && (code.includes('concat') || code.includes('+'))) {
      suggestions.push({
        type: 'string',
        message: 'String concatenation is gas-expensive. Consider using bytes or assembly.',
        confidence: 0.7,
        impact: 'high',
        source: 'static',
        estimatedSaving: 8000
      });
    }

    // Rule 4: Dynamic arrays
    if (code.includes('.push(') || code.includes('.pop()')) {
      suggestions.push({
        type: 'array',
        message: 'Dynamic array operations are expensive. Consider using fixed-size arrays when possible.',
        confidence: 0.5,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 4000
      });
    }
  }

  static analyzeVariableOptimizations(code, suggestions) {
    // Rule 1: Variable type optimization
    if (code.includes('uint256') && code.includes('< 256')) {
      suggestions.push({
        type: 'types',
        message: 'Consider using uint8 or uint16 for small values to save gas in structs.',
        confidence: 0.4,
        impact: 'low',
        source: 'static',
        estimatedSaving: 1000
      });
    }

    // Rule 2: Constant variables
    const constantPattern = /\b(\w+)\s*=\s*[\d"'][^;]*;.*?\b\1\b/g;
    if (constantPattern.test(code) && !code.includes('constant')) {
      suggestions.push({
        type: 'constants',
        message: 'Consider marking unchanging values as "constant" or "immutable".',
        confidence: 0.6,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 2000
      });
    }

    // Rule 3: Unnecessary variable declarations
    if (code.includes('uint256 i = 0')) {
      suggestions.push({
        type: 'variables',
        message: 'Avoid explicit initialization of loop counters to 0 (default value).',
        confidence: 0.8,
        impact: 'low',
        source: 'static',
        estimatedSaving: 500
      });
    }
  }

  static analyzeControlFlowOptimizations(code, suggestions) {
    // Rule 1: Early returns
    const requireCount = (code.match(/require\s*\(/g) || []).length;
    if (requireCount > 2) {
      suggestions.push({
        type: 'control_flow',
        message: 'Multiple require statements detected. Consider custom errors and early returns.',
        confidence: 0.7,
        impact: 'medium',
        source: 'static',
        estimatedSaving: requireCount * 1000
      });
    }

    // Rule 2: Short-circuiting
    if (code.includes('&&') || code.includes('||')) {
      suggestions.push({
        type: 'control_flow',
        message: 'Optimize boolean operations by placing cheaper conditions first.',
        confidence: 0.5,
        impact: 'low',
        source: 'static',
        estimatedSaving: 500
      });
    }

    // Rule 3: Switch vs if-else chains
    const ifElseCount = (code.match(/\belse\s+if\b/g) || []).length;
    if (ifElseCount > 3) {
      suggestions.push({
        type: 'control_flow',
        message: 'Consider using mapping-based lookup instead of long if-else chains.',
        confidence: 0.6,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 3000
      });
    }
  }

  static analyzeAdvancedPatterns(code, functionName, suggestions) {
    // Rule 1: Reentrancy patterns
    if (code.includes('.call(') && !code.includes('nonReentrant')) {
      suggestions.push({
        type: 'security',
        message: 'External call detected. Consider reentrancy protection and checks-effects-interactions pattern.',
        confidence: 0.8,
        impact: 'high',
        source: 'static',
        estimatedSaving: 0 // Security over savings
      });
    }

    // Rule 2: Event optimization
    if (code.includes('emit') && code.includes('string')) {
      suggestions.push({
        type: 'events',
        message: 'Avoid emitting strings in events. Use indexed parameters and bytes32 when possible.',
        confidence: 0.7,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 5000
      });
    }

    // Rule 3: Function naming patterns
    if (functionName.includes('get') && code.includes('return')) {
      suggestions.push({
        type: 'patterns',
        message: 'Getter functions should be marked as "view" and consider using public variables instead.',
        confidence: 0.6,
        impact: 'low',
        source: 'static',
        estimatedSaving: 1000
      });
    }

    // Rule 4: Assembly opportunities
    if (code.includes('keccak256') || code.includes('sha256')) {
      suggestions.push({
        type: 'assembly',
        message: 'Consider using inline assembly for hash operations to save gas.',
        confidence: 0.4,
        impact: 'medium',
        source: 'static',
        estimatedSaving: 2000
      });
    }
  }

  // Helper methods
  static hasStateChanges(code) {
    const stateChangePatterns = [
      /\w+\s*=\s*[^=!<>]/,    // Assignment (not comparison)
      /\w+\[\w*\]\s*=/,       // Array/mapping assignment
      /emit\s+\w+/,           // Events
      /\.transfer\(/,         // Transfers
      /\.call\(/,             // External calls
      /\.delegatecall\(/,     // Delegate calls
      /\.send\(/,             // Send calls
      /selfdestruct\(/,       // Self destruct
      /require\(/,            // Require (state change through revert)
      /assert\(/,             // Assert
      /revert\(/,             // Revert
      /delete\s+\w+/,         // Delete operations
      /\.push\(/,             // Array push
      /\.pop\(/               // Array pop
    ];
    
    return stateChangePatterns.some(pattern => pattern.test(code));
  }

  static isPureFunction(code) {
    const stateReadPatterns = [
      /\bmsg\./,              // Message context
      /\btx\./,               // Transaction context
      /\bblock\./,            // Block context
      /\baddress\(this\)/,    // Contract address
      /\bbalance/,            // Balance checks
      /\w+\[\w*\]/,           // Storage/mapping reads
      /\w+\.call/,            // External calls
      /keccak256\(/,          // Hash functions (depend on input)
      /ecrecover\(/           // Signature recovery
    ];
    
    return !stateReadPatterns.some(pattern => pattern.test(code));
  }

  static isCalledInternally(code, functionName) {
    if (!functionName) return false;
    
    // Simple heuristic: check if function name appears elsewhere in code
    // (excluding the function definition itself)
    const functionCalls = code.match(new RegExp(`\\b${functionName}\\s*\\(`, 'g')) || [];
    return functionCalls.length > 1; // More than just the definition
  }

  // Utility method to get total estimated savings
  static getTotalEstimatedSavings(suggestions) {
    return suggestions.reduce((total, suggestion) => {
      return total + (suggestion.estimatedSaving || 0);
    }, 0);
  }

  // Method to categorize suggestions by impact
  static categorizeSuggestionsByImpact(suggestions) {
    return {
      high: suggestions.filter(s => s.impact === 'high'),
      medium: suggestions.filter(s => s.impact === 'medium'),
      low: suggestions.filter(s => s.impact === 'low')
    };
  }

  // Method to get top suggestions by confidence
  static getTopSuggestions(suggestions, limit = 5) {
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}

module.exports = GasRules;
