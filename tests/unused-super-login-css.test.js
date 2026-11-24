'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const superCss = fs.readFileSync(path.join(root, 'assets/super.css'), 'utf8');
const superHtml = fs.readFileSync(path.join(root, 'super.html'), 'utf8');
const superLoginCss = fs.readFileSync(path.join(root, 'assets/super-login.css'), 'utf8');
const superLoginHtml = fs.readFileSync(path.join(root, 'super-login.html'), 'utf8');
const superFirstLoginHtml = fs.readFileSync(path.join(root, 'super-first-login.html'), 'utf8');

test('super dashboard stylesheet excludes retired standalone login and error modal rules', () => {
  const retiredSelectors = [
    '.login-page', '.login-card', '.login-btn', '.login-error', '.login-lang-select',
    '.error-modal', '.error-modal-card', '.error-modal-icon', '.error-modal-message', '.error-modal-btn'
  ];
  for (const selector of retiredSelectors) {
    assert.equal(superCss.includes(selector), false, 'retired selector should not remain: ' + selector);
  }
});

test('super dashboard keeps shared form styles and dedicated login pages keep their own styling', () => {
  assert.ok(superCss.includes('.form-group {'));
  assert.ok(superHtml.includes('assets/super.css'));
  assert.ok(superLoginHtml.includes('assets/super-login.css'));
  assert.ok(superFirstLoginHtml.includes('assets/super-login.css'));
  assert.ok(superLoginCss.includes('.super-login-card {'));
  assert.ok(superLoginCss.includes('.login-error {'));
});
