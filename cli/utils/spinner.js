const logSymbols = require('log-symbols');

class SimpleSpinner {
  constructor(text) {
    this.text = text;
    this.isSpinning = false;
    this.interval = null;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
  }

  start() {
    this.isSpinning = true;
    process.stdout.write(`${this.frames[0]} ${this.text}`);
    
    this.interval = setInterval(() => {
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 80) + '\r');
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      process.stdout.write(`${this.frames[this.frameIndex]} ${this.text}`);
    }, 80);
    
    return this;
  }

  succeed(text) {
    this.stop();
    console.log(`${logSymbols.success} ${text || this.text}`);
    return this;
  }

  fail(text) {
    this.stop();
    console.log(`${logSymbols.error} ${text || this.text}`);
    return this;
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.isSpinning) {
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 80) + '\r');
      this.isSpinning = false;
    }
  }
}

function createSpinner(text) {
  return new SimpleSpinner(text);
}

module.exports = { createSpinner };
