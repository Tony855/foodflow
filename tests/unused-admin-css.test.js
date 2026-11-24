'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const adminCss = fs.readFileSync(path.join(root, 'assets/admin.css'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const adminBundle = fs.readFileSync(path.join(root, 'assets/admin-bundle.js'), 'utf8');
const adminPageFiles = fs.readdirSync(path.join(root, 'pages/admin'))
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(path.join(root, 'pages/admin', name), 'utf8'));
const adminSources = [adminHtml, adminBundle, ...adminPageFiles].join('\n');

test('admin stylesheet excludes legacy form and tab-icon selectors with no source consumers', () => {
  for (const selector of ['.admin-form', '.tab-icon']) {
    assert.equal(adminCss.includes(selector), false, 'unused selector should not remain: ' + selector);
    assert.equal(adminSources.includes(selector.slice(1)), false, 'source should not depend on removed class: ' + selector);
  }
});

test('active admin navigation tab styles remain intact', () => {
  assert.ok(adminCss.includes('.tab-btn.active {'));
  assert.ok(adminCss.includes('.tab-divider {'));
  assert.ok(adminCss.includes('.tab-btn.tab-action {'));
  assert.ok(adminHtml.includes('tab-btn'));
  assert.ok(adminHtml.includes('tab-divider'));
});
