const chalk = require('chalk');

class CLI {
  constructor() {
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    process.on('unhandledRejection', (error) => {
      console.error(chalk.red('✗ Unhandled error:'), error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      console.error(chalk.red('✗ Uncaught exception:'), error.message);
      process.exit(1);
    });
  }

  static validateNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      console.error(chalk.red('✗ Node.js 16 or higher is required'));
      process.exit(1);
    }
  }
}

module.exports = { CLI };
