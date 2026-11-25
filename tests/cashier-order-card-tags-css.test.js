'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const css = fs.readFileSync(path.resolve(__dirname, '../assets/cashier.css'), 'utf8');

test('cashier order-card tags use one authoritative layout rule', () => {
  const rules = [...css.matchAll(/^\.pos-order-card-tags\s*\{([^}]*)\}/gm)];
  assert.equal(rules.length, 1, 'order-card tag layout must not be redefined later');
  assert.match(rules[0][1], /margin-top:\s*8px/);
  assert.match(rules[0][1], /width:\s*100%/);
  assert.match(rules[0][1], /display:\s*flex/);
  assert.match(rules[0][1], /flex-wrap:\s*wrap/);
});
