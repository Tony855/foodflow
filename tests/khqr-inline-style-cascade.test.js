'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('KHQR markup does not retain inline declarations overridden by shared important rules', () => {
  for (const page of ['cashier.html', 'waiter.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const start = html.indexOf('id="khqrModal"');
    assert.notEqual(start, -1);
    const end = html.indexOf('</div>', start);
    const khqr = html.slice(start, start + 6000);
    assert.doesNotMatch(khqr, /class="payment-amount" style="padding:\s*8px 0 16px"/);
    assert.doesNotMatch(khqr, /class="payment-actions" style="margin-top:\s*18px"/);
    assert.doesNotMatch(khqr, /id="khqrStatusBar" style="margin-top:\s*14px/);
  }
  const waiterHtml = fs.readFileSync(path.join(root, 'waiter.html'), 'utf8');
  assert.doesNotMatch(waiterHtml, /class="payment-card" style="max-width:\s*460px/);
  assert.match(waiterHtml, /class="payment-card" style="text-align:center;"/);
});
