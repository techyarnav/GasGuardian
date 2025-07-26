const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');

const execAsync = promisify(exec);

class HardhatAdapter {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.gasReportFile = options.gasReportFile || 'gasReporterOutput.json';
    }

    async isHardhatProject() {
        const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
        if (!isTest) {
            console.log(`🐛 Debug - Checking if Hardhat project at: ${this.projectRoot}`);
        }

        const hardhatConfig = path.join(this.projectRoot, 'hardhat.config.js');
        const hardhatConfigTs = path.join(this.projectRoot, 'hardhat.config.ts');
        const packageJson = path.join(this.projectRoot, 'package.json');

        if (!isTest) {
            console.log(`🐛 Debug - Checking hardhat.config.js: ${hardhatConfig}`);
            console.log(`🐛 Debug - Checking hardhat.config.ts: ${hardhatConfigTs}`);
            console.log(`🐛 Debug - Checking package.json: ${packageJson}`);
        }

        const hasConfigJs = await fs.pathExists(hardhatConfig);
        const hasConfigTs = await fs.pathExists(hardhatConfigTs);
        const hasPackageJson = await fs.pathExists(packageJson);

        if (!isTest) {
            console.log(`🐛 Debug - hardhat.config.js exists: ${hasConfigJs}`);
            console.log(`🐛 Debug - hardhat.config.ts exists: ${hasConfigTs}`);
            console.log(`🐛 Debug - package.json exists: ${hasPackageJson}`);
        }

        const hasConfig = hasConfigJs || hasConfigTs;

        if (hasPackageJson) {
            try {
                const pkg = await fs.readJson(packageJson);
                const hasHardhat = !!(pkg.devDependencies?.hardhat || pkg.dependencies?.hardhat);
                if (!isTest) {
                    console.log(`🐛 Debug - package.json has hardhat dependency: ${hasHardhat}`);
                }
                const result = hasConfig || hasHardhat;
                if (!isTest) {
                    console.log(`🐛 Debug - Final result: ${result}`);
                }
                return result; 
            } catch (error) {
                if (!isTest) {
                    console.log(`🐛 Debug - Error reading package.json: ${error.message}`);
                }
                return hasConfig;
            }
        }

        if (!isTest) {
            console.log(`🐛 Debug - No package.json, using config check: ${hasConfig}`);
        }
        return hasConfig;
    }

    parseGasReportText(content) {
        const gasData = {};
        const lines = content.split('\n');
        console.log('🐛 Debug - Parsing gas report text, lines:', lines.length);

        for (const line of lines) {
            const methodMatch = line.match(/\|\s*GasTestContract\s*·\s*(\w+)\s*·[^·]*·[^·]*·\s*(\d+)\s*·/);
            if (methodMatch) {
                const functionName = methodMatch[1].toLowerCase();
                const avgGas = parseInt(methodMatch[2]);

                if (avgGas > 0) {
                    gasData[functionName] = avgGas;
                    console.log(`🐛 Debug - Hardhat text parse - Function: ${functionName} -> Gas: ${avgGas}`);
                }
            }
        }

        console.log('🐛 Debug - Final gasData from Hardhat text:', gasData);
        return gasData;
    }

    async loadGasReport(projectDir) {
        const reportPaths = [
            path.join(projectDir, this.gasReportFile),
            path.join(projectDir, 'gas-report.json'),
            path.join(projectDir, 'reports', 'gas-report.json'),
            path.join(projectDir, '.gas-report.json')
        ];

        console.log('🔍 Looking for gas report files...');
        for (const reportPath of reportPaths) {
            console.log(`🔍 Checking: ${reportPath}`);
            if (await fs.pathExists(reportPath)) {
                console.log('📄 Found gas report file');

                try {
                    const content = await fs.readFile(reportPath, 'utf8');

                    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                        console.log('🐛 Debug - Parsing as JSON format');
                        const reportData = JSON.parse(content);
                        return this.parseGasReport(reportData);
                    } else {
                        console.log('🐛 Debug - Parsing as text format');
                        return this.parseGasReportText(content);
                    }
                } catch (error) {
                    console.log(`🐛 Debug - JSON parse failed, trying text: ${error.message}`);
                    const content = await fs.readFile(reportPath, 'utf8');
                    return this.parseGasReportText(content);
                }
            }
        }

        console.log('⚠️  No gas report files found');
        return {};
    }

    async findHardhatProjectRoot(contractPath) {
        console.log(`🐛 Debug - Finding Hardhat project root from: ${contractPath}`);

        let currentDir = path.dirname(path.resolve(contractPath));
        console.log(`🐛 Debug - Starting directory: ${currentDir}`);

        while (currentDir !== path.dirname(currentDir)) { 
            console.log(`🐛 Debug - Checking directory: ${currentDir}`);

            const hardhatConfig = path.join(currentDir, 'hardhat.config.js');
            const hardhatConfigTs = path.join(currentDir, 'hardhat.config.ts');
            const packageJson = path.join(currentDir, 'package.json');

            const hasConfig = (await fs.pathExists(hardhatConfig)) || (await fs.pathExists(hardhatConfigTs));
            console.log(`🐛 Debug - Has hardhat config: ${hasConfig}`);

            if (hasConfig) {
                console.log(`🐛 Debug - Found Hardhat project at: ${currentDir}`);
                return currentDir;
            }

            if (await fs.pathExists(packageJson)) {
                try {
                    const pkg = await fs.readJson(packageJson);
                    const hasHardhat = pkg.devDependencies?.hardhat || pkg.dependencies?.hardhat;
                    console.log(`🐛 Debug - Package.json has hardhat: ${hasHardhat}`);
                    if (hasHardhat) {
                        console.log(`🐛 Debug - Found Hardhat project via package.json at: ${currentDir}`);
                        return currentDir;
                    }
                } catch (error) {
                    console.log(`🐛 Debug - Error reading package.json: ${error.message}`);
                }
            }

            currentDir = path.dirname(currentDir);
        }

        console.log(`🐛 Debug - No Hardhat project found`);
        return null; 
    }

    async findHardhatProjectRoot(contractPath) {
        let currentDir = path.dirname(path.resolve(contractPath));

        while (currentDir !== path.dirname(currentDir)) { 
            const hardhatConfig = path.join(currentDir, 'hardhat.config.js');
            const hardhatConfigTs = path.join(currentDir, 'hardhat.config.ts');
            const packageJson = path.join(currentDir, 'package.json');

            const hasConfig = (await fs.pathExists(hardhatConfig)) || (await fs.pathExists(hardhatConfigTs));

            if (hasConfig) {
                return currentDir;
            }

            if (await fs.pathExists(packageJson)) {
                try {
                    const pkg = await fs.readJson(packageJson);
                    const hasHardhat = pkg.devDependencies?.hardhat || pkg.dependencies?.hardhat;
                    if (hasHardhat) {
                        return currentDir;
                    }
                } catch (error) {
                }
            }

            currentDir = path.dirname(currentDir);
        }

        return null; 
    }

    async generateGasReport(contractPath = null) {
        try {
            console.log('🔨 Running Hardhat gas report...');
            let projectDir = this.projectRoot;
            if (contractPath) {
                const hardhatRoot = await this.findHardhatProjectRoot(contractPath);
                if (hardhatRoot) {
                    projectDir = hardhatRoot;
                    console.log(`📁 Found Hardhat project at: ${projectDir}`);
                }
            }

            await execAsync('npx hardhat --version', { cwd: projectDir });

            await this.ensureGasReporter(projectDir);

            const { stdout, stderr } = await execAsync('npx hardhat test', {
                cwd: projectDir,
                timeout: 180000,
                env: { ...process.env, REPORT_GAS: 'true' }
            });

            if (stderr && !stderr.includes('warning')) {
                console.warn('Hardhat warnings:', stderr);
            }

            const gasReportData = await this.loadGasReport(projectDir);
            if (gasReportData && Object.keys(gasReportData).length > 0) {
                return gasReportData;
            }

            console.log('📄 Parsing gas data from test output...');
            return this.parseTestOutput(stdout);
        } catch (error) {
            if (error.message.includes('hardhat not found')) {
                throw new Error('Hardhat not installed. Install with: npm install --save-dev hardhat');
            } else {
                throw new Error(`Hardhat gas report failed: ${error.message}`);
            }
        }
    }

    async ensureGasReporter(projectDir) {
        const packageJsonPath = path.join(projectDir, 'package.json');

        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);

            if (!packageJson.devDependencies?.['hardhat-gas-reporter']) {
                console.log('⚠️  hardhat-gas-reporter not found but continuing...');
                console.log('💡 For better gas reporting, install: npm install --save-dev hardhat-gas-reporter');
            }
        }
    }

    async loadGasReport(projectDir) {
        const reportPaths = [
            path.join(projectDir, this.gasReportFile),
            path.join(projectDir, 'gas-report.json'),
            path.join(projectDir, 'reports', 'gas-report.json'),
            path.join(projectDir, '.gas-report.json')
        ];

        console.log('🔍 Looking for gas report files...');
        for (const reportPath of reportPaths) {
            console.log(`🔍 Checking: ${reportPath}`);
            if (await fs.pathExists(reportPath)) {
                console.log('📄 Found gas report file');
                const reportData = await fs.readJson(reportPath);
                return this.parseGasReport(reportData);
            }
        }

        console.log('⚠️  No gas report JSON files found');
        return {};
    }

    parseGasReport(reportData) {
        const gasData = {};
        console.log('🐛 Debug - Gas report keys:', Object.keys(reportData));

        if (reportData.info && reportData.info.methods) {
            Object.keys(reportData.info.methods).forEach(contractName => {
                const contract = reportData.info.methods[contractName];
                Object.keys(contract).forEach(methodName => {
                    const method = contract[methodName];
                    if (method.avg) {
                        const functionName = methodName.toLowerCase();
                        gasData[functionName] = method.avg;
                        console.log(`🐛 Debug - Gas report parse - Function: ${functionName} -> Gas: ${method.avg}`);
                    }
                });
            });
        }

        if (reportData.methods) {
            Object.keys(reportData.methods).forEach(methodName => {
                const method = reportData.methods[methodName];
                if (method.gasUsed) {
                    const functionName = methodName.toLowerCase();
                    gasData[functionName] = method.gasUsed;
                    console.log(`🐛 Debug - Alternative format - Function: ${functionName} -> Gas: ${method.gasUsed}`);
                }
            });
        }

        console.log('🐛 Debug - Final gasData from report:', gasData);
        return gasData;
    }

    parseTestOutput(output) {
        const gasData = {};
        const lines = output.split('\n');
        console.log('🐛 Debug - Parsing test output, lines:', lines.length);

        for (const line of lines) {
            const consoleMatch = line.match(/(\w+)\s+gas used:\s*(\d+)/i);
            if (consoleMatch) {
                const functionName = consoleMatch[1].toLowerCase();
                const gasUsed = parseInt(consoleMatch[2]);
                gasData[functionName] = gasUsed;
                console.log(`🐛 Debug - Console parse - Function: ${functionName} -> Gas: ${gasUsed}`);
            }

            const batchMatch = line.match(/batch\s+transfer.*?gas used:\s*(\d+)/i);
            if (batchMatch) {
                gasData['batchtransfer'] = parseInt(batchMatch[1]);
                console.log(`🐛 Debug - Batch parse - Function: batchtransfer -> Gas: ${batchMatch[1]}`);
            }
        }

        console.log('🐛 Debug - Final gasData from test output:', gasData);
        return gasData;
    }

    async generateGasReport(contractPath = null) {
        try {
            console.log('🔨 Running Hardhat gas report...');

            let projectDir = this.projectRoot;
            if (contractPath) {
                const hardhatRoot = await this.findHardhatProjectRoot(contractPath);
                if (hardhatRoot) {
                    projectDir = hardhatRoot;
                    console.log(`📁 Found Hardhat project at: ${projectDir}`);
                }
            }

            await execAsync('npx hardhat --version', { cwd: projectDir });
            await this.ensureGasReporter(projectDir);

            const { stdout, stderr } = await execAsync('npx hardhat test', {
                cwd: projectDir,
                timeout: 180000,
                env: { ...process.env, REPORT_GAS: 'true' }
            });

            if (stderr && !stderr.includes('warning')) {
                console.warn('Hardhat warnings:', stderr);
            }
            console.log('📄 Parsing gas data from console output...');
            const consoleGasData = this.parseTestOutput(stdout);
            if (Object.keys(consoleGasData).length > 0) {
                return consoleGasData;
            }

            const gasReportData = await this.loadGasReport(projectDir);
            return gasReportData;

        } catch (error) {
            if (error.message.includes('hardhat not found')) {
                throw new Error('Hardhat not installed. Install with: npm install --save-dev hardhat');
            } else {
                throw new Error(`Hardhat gas report failed: ${error.message}`);
            }
        }
    }

    extractFunctionName(testName) {
        const match = testName.match(/test_?(\w+)/i);
        return match ? match[1].toLowerCase() : null;
    }

    async getGasData(contractPath = null) {
        try {
            return await this.generateGasReport(contractPath);
        } catch (error) {
            console.warn(`Could not generate Hardhat gas report: ${error.message}`);
            return {};
        }
    }
}

module.exports = { HardhatAdapter };
