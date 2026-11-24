'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const cashierCss = fs.readFileSync(path.join(root, 'assets/cashier.css'), 'utf8');
const cashierHtml = fs.readFileSync(path.join(root, 'cashier.html'), 'utf8');
const cashierJs = fs.readFileSync(path.join(root, 'pages/cashier.js'), 'utf8');

test('legacy refund modal selectors with no markup or script consumers stay out of cashier CSS', () => {
  const unusedSelectors = [
    '.refund-card',
    '.refund-title',
    '.refund-amount',
    '.refund-amount-label',
    '.refund-amount-value',
    '.refund-reason-row',
    '.refund-actions'
  ];

  for (const selector of unusedSelectors) {
    assert.doesNotMatch(cashierCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])'),
      `obsolete selector should not remain: ${selector}`);
    assert.doesNotMatch(cashierHtml, new RegExp(selector.slice(1) + '(?![\\w-])'));
    assert.doesNotMatch(cashierJs, new RegExp(selector.slice(1) + '(?![\\w-])'));
  }
});

test('active refund form styles remain available to the current cashier modal', () => {
  assert.match(cashierHtml, /class=["'][^"']*refund-input-row/);
  assert.match(cashierHtml, /class=["'][^"']*refund-input/);
  assert.match(cashierHtml, /class=["'][^"']*refund-textarea/);
  assert.match(cashierCss, /\.refund-input-row\s*\{/);
  assert.match(cashierCss, /\.refund-input\s*\{/);
  assert.match(cashierCss, /\.refund-textarea\s*\{/);
});
