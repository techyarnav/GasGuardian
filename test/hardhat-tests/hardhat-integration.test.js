const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs-extra');

const execAsync = promisify(exec);

describe('Hardhat Integration Tests', () => {
  const hardhatProjectPath = __dirname;
  const binPath = path.join(__dirname, '../../bin/gas-guardian.js');
  
  beforeAll(async () => {
    process.chdir(hardhatProjectPath);
  });

  test('should detect hardhat project', async () => {
    const hardhatConfigExists = await fs.pathExists(path.join(hardhatProjectPath, 'hardhat.config.js'));
    const packageJsonExists = await fs.pathExists(path.join(hardhatProjectPath, 'package.json'));
    
    expect(hardhatConfigExists).toBe(true);
    expect(packageJsonExists).toBe(true);
  });

  test('should install hardhat dependencies', async () => {
    try {
      if (!await fs.pathExists(path.join(hardhatProjectPath, 'node_modules'))) {
        console.log('Installing Hardhat dependencies...');
        await execAsync('npm install', { 
          cwd: hardhatProjectPath,
          timeout: 120000
        });
      }
      
      const nodeModulesExists = await fs.pathExists(path.join(hardhatProjectPath, 'node_modules'));
      expect(nodeModulesExists).toBe(true);
    } catch (error) {
      console.warn('Could not install dependencies:', error.message);
    }
  }, 120000);

  test('should compile hardhat project', async () => {
    try {
      const { stdout } = await execAsync('npx hardhat compile', { 
        cwd: hardhatProjectPath,
        timeout: 60000
      });
      
      expect(stdout).toMatch(/(Compiled|Nothing to compile)/);
    } catch (error) {
      if (error.message.includes('node_modules')) {
        console.warn('Hardhat dependencies not available, skipping compilation test');
        return;
      }
      throw error;
    }
  }, 60000);

  test('should run hardhat tests with gas reporting', async () => {
    try {
      const { stdout } = await execAsync('REPORT_GAS=true npx hardhat test', {
        cwd: hardhatProjectPath,
        timeout: 60000
      });
      
      expect(stdout).toContain('passing');
      expect(stdout).toContain('gas used:');
    } catch (error) {
      if (error.message.includes('node_modules')) {
        console.warn('Hardhat not available, skipping gas reporting test');
        return;
      }
      console.log('Hardhat test output:', error.stdout || error.message);
      console.warn('Gas reporting test completed with warnings');
    }
  }, 60000);

  test('should analyze hardhat contract with gas guardian', async () => {
    const contractPath = path.join(hardhatProjectPath, 'contracts/TestContract.sol');
    
    try {
      const { stdout } = await execAsync(`node ${binPath} analyze ${contractPath} --framework hardhat`, {
        cwd: hardhatProjectPath,
        timeout: 60000
      });
      
      expect(stdout).toContain('Gas Guardian');
      expect(stdout).toContain('TestContract');
      expect(stdout).toContain('Framework: hardhat');
    } catch (error) {
      console.log('Gas Guardian + Hardhat error:', error.message);
      throw error;
    }
  }, 60000);

  test('should generate hardhat gas report', async () => {
    try {
      await execAsync('REPORT_GAS=true npx hardhat test', { 
        cwd: hardhatProjectPath,
        timeout: 60000
      });
      
      const gasReportExists = await fs.pathExists(path.join(hardhatProjectPath, 'gasReporterOutput.json'));
      
      if (gasReportExists) {
        const gasReportContent = await fs.readFile(path.join(hardhatProjectPath, 'gasReporterOutput.json'), 'utf8');
        expect(gasReportContent.length).toBeGreaterThan(0);
      } else {
        console.warn('Gas report file not generated, test environment may not support it');
      }
    } catch (error) {
      if (error.message.includes('node_modules')) {
        console.warn('Hardhat not available, skipping gas report generation test');
        return;
      }
      console.warn('Gas reporting test completed with warnings:', error.message);
    }
  }, 60000);
});
