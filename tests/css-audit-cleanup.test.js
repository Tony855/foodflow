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
const superCss = fs.readFileSync(path.join(root, 'assets/super.css'), 'utf8');
const superHtml = fs.readFileSync(path.join(root, 'super.html'), 'utf8');
const superLoginHtml = fs.readFileSync(path.join(root, 'super-login.html'), 'utf8');
const superFirstLoginHtml = fs.readFileSync(path.join(root, 'super-first-login.html'), 'utf8');
const superLoginCss = fs.readFileSync(path.join(root, 'assets/super-login.css'), 'utf8');
const superSources = [superHtml, superLoginHtml, superFirstLoginHtml, superLoginCss].join('\n');

test('admin modules have one authoritative 1024px offset/padding rule', () => {
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

test('admin tab-icon styling is retired without HTML, bundle, or module consumers', () => {
  assert.equal(adminCss.includes('.tab-icon'), false);
  assert.equal(adminSources.includes('tab-icon'), false);
  assert.ok(adminCss.includes('.tab-btn.active {'));
  assert.ok(adminCss.includes('.tab-divider {'));
  assert.ok(adminCss.includes('.tab-btn.tab-action {'));
});

test('super dashboard has no retired login-lang-select or stat-card unit styling', () => {
  assert.equal(superCss.includes('.login-lang-select'), false);
  assert.equal(superCss.includes('.stat-card .unit'), false);
  assert.equal(superSources.includes('login-lang-select'), false);
  assert.equal(superSources.includes('stat-card .unit'), false);
  assert.ok(superLoginCss.includes('.super-login-card {'));
  assert.ok(superLoginCss.includes('.login-error {'));
});
