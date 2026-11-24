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

test('base styles load before page-specific styles', () => {
  const customerHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const waiterHtml = fs.readFileSync(path.join(root, 'waiter.html'), 'utf8');
  const cashierHtml = fs.readFileSync(path.join(root, 'cashier.html'), 'utf8');

  const hrefs = (html) => [...html.matchAll(/<link\\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1]);

  const customer = hrefs(customerHtml);
  assert.ok(customer.indexOf('assets/common.css?v=1791356376') < customer.indexOf('assets/customer.css?v=2026111601'));

  const waiter = hrefs(waiterHtml);
  assert.ok(waiter.indexOf('assets/common.css?v=1791356376') < waiter.indexOf('assets/khqr-shared.css?v=1'));
  assert.ok(waiter.indexOf('assets/khqr-shared.css?v=1') < waiter.indexOf('assets/waiter.css?v=1791410238'));

  const cashier = hrefs(cashierHtml);
  assert.ok(cashier.indexOf('assets/common.css?v=1791356376') < cashier.indexOf('assets/khqr-shared.css?v=1'));
  assert.ok(cashier.indexOf('assets/khqr-shared.css?v=1') < cashier.indexOf('assets/cashier.css?v=1791407775'));
});
