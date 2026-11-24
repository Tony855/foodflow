'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const adminCss = fs.readFileSync(path.join(root, 'assets/admin.css'), 'utf8');

test('admin permission grid has one responsive rule inherited by narrower breakpoints', () => {
  const rules = [...adminCss.matchAll(/\.admin-perm-items\s*\{([^}]*)\}/g)];
  assert.equal(rules.length, 2);
  const responsiveRules = rules.filter(match => /grid-template-columns:\s*1fr/.test(match[1]));
  assert.equal(responsiveRules.length, 1);
  const breakpoint = adminCss.indexOf('@media (max-width: 760px)');
  assert.notEqual(breakpoint, -1);
  assert.ok(adminCss.indexOf('.admin-perm-items {', breakpoint) !== -1);
});
