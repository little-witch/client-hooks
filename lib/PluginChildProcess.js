'use strict';

// @TODO: Wait to node.js achieve harmony module.
const spawn = require('child_process').spawn;

const fs = require('fs');

class PluginChildProcess {
  constructor({ cwd = '', isStdout = false, pluginName = '' } = {}) {
    this[Symbol.for('pluginName')] = pluginName;
    this[Symbol.for('isStdout')] = isStdout;
    this[Symbol.for('cwd')] = cwd;

    this[Symbol.for('initPluginProcess')]();
  }

  isStdout() {
    return this[Symbol.for('isStdout')];
  }

  setStdout(isStdout = false) {
    this[Symbol.for('isStdout')]= isStdout;
  }

  isClose() {
    return this[Symbol.for('isClose')];
  }

  getCwd() {
    return this[Symbol.for('cwd')];
  }

  getProcess() {
    return this[Symbol.for('process')];
  }

  getNameSpace() {
    const nameSpace = 'client-hooks';
    return nameSpace;
  }

  getPluginName() {
    return this[Symbol.for('pluginName')];
  }

  getOutputIterator() {
    let outputQueue = this[Symbol.for('outputQueue')];
    let outputIterator = this[Symbol.for('outputGenerator')](outputQueue);
    return outputIterator;
  }

  getClosePromise() {
    const closePromise = new Promise((resolve, reject) => {
      const pluginProcess = this.getProcess();
      pluginProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true);
          this[Symbol.for('isClose')] = true;
        }
      });
    });
    return closePromise;
  }

  getErrorPromise() {
    const errorPromise = new Promise((resolve, reject) => {
      const pluginChildProcess = this.getProcess();

      pluginChildProcess.stderr.on('data', (buffer) => {
        let name = this.getPluginName();
        let text = buffer.toString();
        reject({ text, name });
      });

      pluginChildProcess.on('close', (code) => {
        if (code !== 0) {
          let text = `plugin child process exited with code ${code}`;
          let name = this.getPluginName();
          reject({ text,  name });
        }
      });
    });
    return errorPromise;
  }

  *[Symbol.for('outputGenerator')](outputQueue = []) {
    while (outputQueue.length) {
      yield outputQueue.shift();
    }
  }

  [Symbol.for('initProcessOutput')]() {
    const pluginChildProcess = this.getProcess();

    this[Symbol.for('outputQueue')] = [];

    pluginChildProcess.stdout.on('data', (buffer) => {
      let text = buffer.toString();

      if (this.isStdout()) {
        process.stdout.write(text);
      }
      else {
        this[Symbol.for('outputQueue')].push(text);
      }
    });
  }

  [Symbol.for('initPluginProcess')]() {
    const pluginName = this.getPluginName();
    const nameSpace = getNameSpace();
    const cwd = this.getCwd();

    try {
      const PluginClass = require(`${nameSpace}-${pluginName}`);
      const plugin = new PluginClass({ cwd });
      this[Symbol.for('process')] = plugin.getProcess();
    }
    catch (error) {
      const reason = `plugin don't exist, please check name or install first.`;
      const error = new PluginDontExistError({ reason, pluginName });
      throw error;
    }

    this[Symbol.for('initProcessOutput')]();
  }
}

class PluginDontExistError extends Error {
  constructor({ reason = '', pluginName = '' } = {}) {
    super(reason);
    this.pluginName = pluginName;
  }
}

module.exports = PluginChildProcess;