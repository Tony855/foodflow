'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

function assertRouteDependencies(routeFile, dependencies) {
  const escaped = routeFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const registration = new RegExp(
    "require\\(['\"]\\./" + escaped + "['\"]\\)\\(app,\\s*\\{([\\s\\S]*?)\\}\\s*\\)"
  );
  const match = serverSource.match(registration);
  assert.ok(match, `route ${routeFile} must be registered in server.js`);
  for (const dependency of dependencies) {
    assert.match(match[1], new RegExp('\\\\b' + dependency + '\\\\b'),
      `route ${routeFile} must receive ${dependency}`);
  }
}

test('transactional admin routes receive the transaction helper they invoke', () => {
  assertRouteDependencies('routes/admin-printers.js', ['withTransaction', 'getClientIp']);
  assertRouteDependencies('routes/admin-system.js', ['withTransaction']);
});
