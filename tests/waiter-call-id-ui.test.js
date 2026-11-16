'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('admin and kitchen waiter-call actions preserve opaque string IDs', () => {
  const adminSource = fs.readFileSync(path.join(root, 'pages/admin/report.js'), 'utf8');
  const adminBundle = fs.readFileSync(path.join(root, 'assets/admin-bundle.js'), 'utf8');
  const kitchenSource = fs.readFileSync(path.join(root, 'pages/kitchen.js'), 'utf8');

  for (const source of [adminSource, adminBundle]) {
    assert.match(source, /data-call-id="\$\{esc\(c\.id\)\}" onclick="handleWaiterCall\(this\.dataset\.callId\)"/);
    assert.doesNotMatch(source, /handleWaiterCall\(\$\{Number\(c\.id\)\}\)/);
  }

  assert.match(kitchenSource, /data-call-id="\$\{utils\.esc\(c\.id\)\}" onclick="handleUrge\(this\.dataset\.callId\)"/);
  assert.doesNotMatch(kitchenSource, /handleUrge\(\$\{Number\(c\.id\)\}\)/);
});
