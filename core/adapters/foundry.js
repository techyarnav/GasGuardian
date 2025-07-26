const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');

const execAsync = promisify(exec);

class FoundryAdapter {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.snapshotFile = options.snapshotFile || '.gas-snapshot';
  }

  async isFoundryProject() {
    const foundryToml = path.join(this.projectRoot, 'foundry.toml');
    const libDir = path.join(this.projectRoot, 'lib');
    return (await fs.pathExists(foundryToml)) || (await fs.pathExists(libDir));
  }

  async findFoundryProjectRoot(contractPath) {
    let currentDir = path.dirname(path.resolve(contractPath));
    let depth = 0;
    const maxDepth = 10;
    
    while (depth < maxDepth) {
      if (currentDir === '/' || 
          currentDir === '/var' || 
          currentDir === '/usr' || 
          currentDir === '/System' ||
          currentDir === '/home' ||
          currentDir === '/Users') {
        break;
      }
      
      const foundryToml = path.join(currentDir, 'foundry.toml');
      const libDir = path.join(currentDir, 'lib');
      
      if ((await fs.pathExists(foundryToml)) || (await fs.pathExists(libDir))) {
        return currentDir;
      }
      
      const parentDir = path.dirname(currentDir);
      
      if (parentDir === currentDir) {
        break;
      }
      
      currentDir = parentDir;
      depth++;
    }
    
    return null; 
  }

  async generateGasSnapshot(contractPath = null) {
    try {
      console.log('🔨 Running Foundry gas snapshot...');
      
      let projectDir = this.projectRoot;
      if (contractPath) {
        const foundryRoot = await this.findFoundryProjectRoot(contractPath);
        if (foundryRoot) {
          projectDir = foundryRoot;
          console.log(`📁 Found Foundry project at: ${projectDir}`);
        }
      }
      
      await execAsync('forge --version', { cwd: projectDir });
      
      await execAsync('forge snapshot', {
        cwd: projectDir,
        timeout: 120000 // 2 minute timeout
      });

      const snapshotPath = path.join(projectDir, '.gas-snapshot');
      if (await fs.pathExists(snapshotPath)) {
        const content = await fs.readFile(snapshotPath, 'utf8');
        console.log('📄 Reading gas snapshot from file...');
        return this.parseSnapshotFile(content);
      } else {
        throw new Error('Gas snapshot file not generated');
      }
    } catch (error) {
      if (error.message.includes('command not found')) {
        throw new Error('Foundry not installed. Install from: https://getfoundry.sh');
      } else if (error.message.includes('No tests found')) {
        throw new Error('No test files found. Create tests to generate gas snapshots.');
      } else {
        throw new Error(`Foundry snapshot failed: ${error.message}`);
      }
    }
  }

  async loadExistingSnapshot(contractPath = null) {
    let projectDir = this.projectRoot;
    if (contractPath) {
      const foundryRoot = await this.findFoundryProjectRoot(contractPath);
      if (foundryRoot) {
        projectDir = foundryRoot;
      }
    }
    
    const snapshotPath = path.join(projectDir, this.snapshotFile);
    
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    if (!isTest) {
      console.log(`🔍 Looking for snapshot at: ${snapshotPath}`);
    }
    
    if (await fs.pathExists(snapshotPath)) {
      const content = await fs.readFile(snapshotPath, 'utf8');
      if (!isTest) {
        console.log('📄 Found existing snapshot file');
      }
      return this.parseSnapshotFile(content);
    }
    
    if (!isTest) {
      console.log('⚠️  No existing snapshot file found');
    }
    return null;
  }

  parseSnapshotFile(content) {
    const gasData = {};
    const lines = content.split('\n');
    
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    if (!isTest) {
      console.log('🐛 Debug - Snapshot file lines:', lines.length);
    }
    
    for (const line of lines) {
      if (line.trim()) {
        const match = line.match(/(\w+):test(\w+)\(\)\s+\(gas:\s*(\d+)\)/);
        if (match) {
          const functionName = match[2].toLowerCase();
          const gasUsed = parseInt(match[3]);
          if (!isTest) {
            console.log(`🐛 Debug - Snapshot parse - Function: ${functionName} -> Gas: ${gasUsed}`);
          }
          gasData[functionName] = gasUsed;
        }
      }
    }
    
    if (!isTest) {
      console.log('🐛 Debug - Final gasData from snapshot:', gasData);
    }
    return gasData;
  }

  parseForgeOutput(output) {
    const gasData = {};
    
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    if (!isTest) {
      console.log('🐛 Debug - Raw forge output:', output.substring(0, 200) + '...');
    }
    
    try {
      const jsonData = JSON.parse(output);
      if (!isTest) {
        console.log('🐛 Debug - Parsed JSON keys:', Object.keys(jsonData));
      }
      
      if (jsonData && typeof jsonData === 'object') {
        Object.keys(jsonData).forEach(testFile => {
          const testFileData = jsonData[testFile];
          
          if (testFileData && testFileData.test_results) {
            if (!isTest) {
              console.log('🐛 Debug - Found test_results structure');
            }
            Object.keys(testFileData.test_results).forEach(testName => {
              const testResult = testFileData.test_results[testName];
              
              if (testResult && testResult.gas_used) {
                const functionName = this.extractFunctionName(testName);
                if (!isTest) {
                  console.log(`🐛 Debug - Test: ${testName} -> Function: ${functionName} -> Gas: ${testResult.gas_used}`);
                }
                if (functionName) {
                  gasData[functionName] = parseInt(testResult.gas_used);
                }
              }
            });
          }
          else if (typeof testFileData === 'number') {
            const functionName = this.extractFunctionName(testFile);
            if (!isTest) {
              console.log(`🐛 Debug - Old format - Test: ${testFile} -> Function: ${functionName} -> Gas: ${testFileData}`);
            }
            if (functionName) {
              gasData[functionName] = parseInt(testFileData);
            }
          }
        });
      }
    } catch (error) {
      if (!isTest) {
        console.log('🐛 Debug - JSON parse failed, trying text parsing');
      }
      return this.parseSnapshotText(output);
    }
    
    if (!isTest) {
      console.log('🐛 Debug - Final gasData:', gasData);
    }
    return gasData;
  }

  parseSnapshotText(output) {
    const gasData = {};
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(\w+)::test(\w+)\(\)\s+\(gas:\s*(\d+)\)/);
      if (match) {
        const functionName = match[2].toLowerCase();
        const gasUsed = parseInt(match[3]);
        
        const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
        if (!isTest) {
          console.log(`🐛 Debug - Text parse - Function: ${functionName} -> Gas: ${gasUsed}`);
        }
        gasData[functionName] = gasUsed;
      }
    }
    
    return gasData;
  }

  extractFunctionName(testName) {
    const match = testName.match(/test_?(\w+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  async getGasData(contractPath = null) {
    let gasData = await this.loadExistingSnapshot(contractPath);
    
    if (!gasData || Object.keys(gasData).length === 0) {
      gasData = await this.generateGasSnapshot(contractPath);
    }
    
    return gasData;
  }

  async runTests(contractPath = null) {
    try {
      console.log('🧪 Running Foundry tests...');
      
      let projectDir = this.projectRoot;
      if (contractPath) {
        const foundryRoot = await this.findFoundryProjectRoot(contractPath);
        if (foundryRoot) {
          projectDir = foundryRoot;
        }
      }
      
      const { stdout } = await execAsync('forge test --gas-report', {
        cwd: projectDir,
        timeout: 180000 // 3 minute timeout
      });
      
      return this.parseTestOutput(stdout);
    } catch (error) {
      throw new Error(`Foundry tests failed: ${error.message}`);
    }
  }

  parseTestOutput(output) {
    const gasData = {};
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('gas:') && line.includes('test')) {
        const gasMatch = line.match(/gas:\s*(\d+)/);
        const testMatch = line.match(/test(\w+)/i);
        
        if (gasMatch && testMatch) {
          const functionName = testMatch[1].toLowerCase();
          gasData[functionName] = parseInt(gasMatch[1]);
        }
      }
    }
    
    return gasData;
  }
}

module.exports = { FoundryAdapter };
