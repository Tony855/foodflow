'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('admin stylesheet does not retain the removed admin-form component', () => {
  const css = read('assets/admin.css');
  const html = read('admin.html');
  const script = read('pages/admin.js');
  const bundle = read('assets/admin-bundle.js');

  assert.equal(css.includes('.admin-form'), false);
  for (const source of [html, script, bundle]) {
    assert.equal(source.includes('admin-form'), false);
  }

  // The active admin form layout uses the .form component.
  assert.match(css, /\.form\s*\{/);
  assert.match(html, /class="form/);
});
