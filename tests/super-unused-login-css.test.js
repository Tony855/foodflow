'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('super dashboard stylesheet excludes legacy login-only styles', () => {
  const css = read('assets/super.css');
  const html = read('super.html');
  const script = read('pages/super.js');

  for (const legacySelector of [
    '.login-page',
    '.login-card',
    '.login-btn',
    '.login-error',
    '.error-modal',
    '.error-modal-card',
    '.error-modal-icon',
    '.error-modal-message',
    '.error-modal-btn',
    '@keyframes errorPop',
  ]) {
    assert.equal(css.includes(legacySelector), false, `unexpected stale selector: ${legacySelector}`);
    assert.equal(html.includes(legacySelector.slice(1)), false, `unexpected markup reference: ${legacySelector}`);
    assert.equal(script.includes(legacySelector.slice(1)), false, `unexpected script reference: ${legacySelector}`);
  }

  // The super dashboard still uses shared form-group controls.
  assert.match(css, /\.form-group\s*\{/);
  assert.match(html, /class="form-group"/);
});
