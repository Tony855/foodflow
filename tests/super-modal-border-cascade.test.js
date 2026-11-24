'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('superadmin modal card border is declared once and inherited by mobile breakpoints', () => {
  const css = fs.readFileSync(path.join(root, 'assets/super.css'), 'utf8');
  const baseRule = css.match(/\.modal-card\s*\{([^}]*)\}/);
  assert.ok(baseRule, 'base modal card rule must exist');
  assert.match(baseRule[1], /border:\s*1px solid rgba\(255,255,255,\.1\)/);

  const tabletStart = css.indexOf('@media (max-width: 1024px)');
  assert.notEqual(tabletStart, -1, 'tablet breakpoint must exist');
  const tabletEnd = css.indexOf('\n}', tabletStart);
  assert.notEqual(tabletEnd, -1, 'tablet breakpoint must close');
  const tabletBlock = css.slice(tabletStart, tabletEnd);
  const mobileModalRule = tabletBlock.match(/\.modal-card\s*\{([^}]*)\}/);
  assert.ok(mobileModalRule, 'tablet modal card sizing rule must exist');
  assert.doesNotMatch(mobileModalRule[1], /\bborder(?:-width|-style|-color)?\s*:/,
    'mobile sizing override must inherit the single base border');
});
