'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('refund input row does not keep inline spacing overridden by cashier CSS', () => {
  const html = fs.readFileSync(path.join(root, 'cashier.html'), 'utf8');
  assert.match(html, /<div class="refund-input-row">/);
  assert.doesNotMatch(html, /class="refund-input-row"\s+style=/);

  const css = fs.readFileSync(path.join(root, 'assets/cashier.css'), 'utf8');
  assert.match(css, /#refundModal\s+\.refund-input-row\s*\{[^}]*margin-bottom:\s*14px\s*!important/s);
});
