'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const adminCss = fs.readFileSync(path.join(root, 'assets/admin.css'), 'utf8');

test('admin modules have one authoritative offset and padding rule at 1024px', () => {
  const mediaStart = adminCss.indexOf('@media (max-width: 1024px)');
  assert.notEqual(mediaStart, -1);
  const mediaEnd = adminCss.indexOf('\n}', mediaStart);
  assert.notEqual(mediaEnd, -1);

  const tabletBlock = adminCss.slice(mediaStart, mediaEnd);
  const rules = [...tabletBlock.matchAll(/\.admin-modules\s*\{([^}]*)\}/g)];
  assert.equal(rules.length, 1);
  assert.match(rules[0][1], /margin-left:\s*0\s*!important/);
  assert.match(rules[0][1], /padding:\s*0/);
});
