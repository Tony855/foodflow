'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const commonCss = fs.readFileSync(path.join(root, 'assets/common.css'), 'utf8');
const cashierCss = fs.readFileSync(path.join(root, 'assets/cashier.css'), 'utf8');

test('shared button defaults are not globally overridden by payment-only styles', () => {
  assert.equal((commonCss.match(/(?:^|\n)\.btn-secondary\s*\{/g) || []).length, 1);
  assert.match(commonCss, /\.payment-actions \.btn-secondary\s*\{/);
  assert.match(commonCss, /\.payment-actions \.btn-secondary:hover\s*\{/);
  assert.equal((commonCss.match(/(?:^|\n)\.btn:disabled\s*\{/g) || []).length, 1);
});

test('KHQR and payment modal stacking order is defined only in shared CSS', () => {
  assert.match(commonCss, /#khqrModal\.modal-overlay\s*\{\s*z-index:\s*999\s*!important;/);
  assert.match(commonCss, /#paymentModal\.modal-overlay\s*\{\s*z-index:\s*300;/);
  assert.doesNotMatch(cashierCss, /#(?:khqrModal|paymentModal)\.modal-overlay\s*\{/);
});
