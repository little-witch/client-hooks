'use strict';

const shell = require('shelljs');

if (shell.test('-f', './.gitconfig')) {
  shell.rm('./.gitconfig');
}

shell.exec('git config --local --unset include.path');

if (shell.test('-f', './clienthooks.js')) {
  shell.rm('./clienthooks.js');
}