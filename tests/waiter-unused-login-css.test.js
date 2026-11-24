'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('waiter stylesheet excludes removed login modal styles', () => {
  const css = read('assets/waiter.css');
  const html = read('waiter.html');
  const script = read('pages/waiter.js');

  for (const staleClass of ['login-modal', 'login-btn', 'login-error']) {
    assert.equal(css.includes(staleClass), false, `unexpected stale waiter CSS: ${staleClass}`);
    assert.equal(html.includes(staleClass), false, `unexpected waiter markup: ${staleClass}`);
    assert.equal(script.includes(staleClass), false, `unexpected waiter script reference: ${staleClass}`);
  }

  // Normal waiter dialogs remain styled.
  assert.match(css, /\.modal-card\s*\{/);
  assert.match(css, /\.modal\.open\s*\{/);
});
