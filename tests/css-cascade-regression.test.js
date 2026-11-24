'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const commonCss = fs.readFileSync(path.join(root, 'assets/common.css'), 'utf8');
const cashierCss = fs.readFileSync(path.join(root, 'assets/cashier.css'), 'utf8');
const kitchenCss = fs.readFileSync(path.join(root, 'assets/kitchen.css'), 'utf8');
const adminCss = fs.readFileSync(path.join(root, 'assets/admin.css'), 'utf8');

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

  const hrefs = (html) => [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
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

test('ready-to-settle theme has one authoritative rule per state', () => {
  assert.equal((cashierCss.match(/(?:^|\n)\.pos-order-card\.status-pending\.ready-to-settle\s*\{/g) || []).length, 1);
  assert.equal((cashierCss.match(/(?:^|\n)\.pos-order-card\.status-pending\.ready-to-settle:hover\s*\{/g) || []).length, 1);
  assert.equal((cashierCss.match(/(?:^|\n)\.pos-card-ready-tip\s*\{/g) || []).length, 1);
  assert.equal((cashierCss.match(/(?:^|\n)\.pos-order-card\.ready-to-settle\s*\{/g) || []).length, 1);
  assert.match(cashierCss, /border-left:\s*4px solid #0ea5e9/);
  const readyRule = cashierCss.match(/\.pos-order-card\.status-pending\.ready-to-settle\s*\{([^}]*)\}/);
  assert.ok(readyRule);
  assert.match(readyRule[1], /border-left:\s*4px solid #0ea5e9/);
  assert.doesNotMatch(readyRule[1], /border-left:\s*4px solid #2ecc71/);
});

test('kitchen login layout is defined once without trailing important overrides', () => {
  const wrapRules = kitchenCss.match(/^\s*\.login-wrap\s*\{/gm) || [];
  const boxRules = kitchenCss.match(/^\s*\.login-box\s*\{/gm) || [];
  assert.equal(wrapRules.length, 1);
  assert.equal(boxRules.length, 1);
  assert.doesNotMatch(kitchenCss, /^\s*\.login-(?:wrap|box)\s*\{[^}]*!important/gm);
});

test('admin list action styles are not redefined after the shared action rules', () => {
  const selectors = [
    '#waiterList .actions button.edit-btn',
    '#storeList .actions button.edit-btn',
    '#waiterList .actions button.edit-btn:hover',
    '#storeList .actions button.edit-btn:hover',
    '#waiterList .actions button.danger',
    '#storeList .actions button.danger',
    '#waiterList .actions button.danger:hover',
    '#storeList .actions button.danger:hover',
    '#adminList .admin-card .actions button.edit-btn',
    '#cashierList .admin-card .actions button.edit-btn',
    '#adminList .admin-card .actions button.danger',
    '#cashierList .admin-card .actions button.danger'
  ];
  for (const selector of selectors) {
    let occurrences = 0;
    let offset = 0;
    while ((offset = adminCss.indexOf(selector, offset)) !== -1) {
      const next = adminCss[offset + selector.length] || '';
      if (next !== ':') occurrences += 1;
      offset += selector.length;
    }
    assert.equal(occurrences, 1, `expected one authoritative selector: ${selector}`);
  }
});
