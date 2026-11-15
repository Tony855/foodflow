'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const registerHealthRoute = require('../routes/health');
const registerPublicRoutes = require('../routes/public');

function buildApp() {
  const routes = new Map();
  const registrations = [];
  return {
    routes,
    registrations,
    get(path, handler) { registrations.push({ path, handler }); routes.set(path, handler); }
  };
}

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) { this.headers[name] = value; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function registerReadiness(app, { query, cluster } = {}) {
  registerHealthRoute(app, {
    getPool: () => ({ query: query || (async () => [[{ ok: 1 }], []]) }),
    getClusterReadiness: cluster
  });
}

test('readiness returns 200 only after the database responds', async () => {
  const app = buildApp();
  let sql;
  registerReadiness(app, { query: async value => { sql = value; return [[{ ok: 1 }], []]; } });
  const handler = app.routes.get('/api/health/ready');
  assert.equal(typeof handler, 'function');
  const res = responseRecorder();
  await handler({}, res);
  assert.equal(sql, 'SELECT 1');
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(res.body, { status: 'ok', database: 'ok' });
});

test('readiness fails closed and hides database error details', async () => {
  const app = buildApp();
  registerReadiness(app, { query: async () => { throw new Error('secret database host/password'); } });
  const res = responseRecorder();
  await app.routes.get('/api/health/ready')({}, res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, { status: 'degraded', database: 'unavailable' });
  assert.equal(JSON.stringify(res.body).includes('secret'), false);
});

test('cluster readiness fails closed when Redis or Socket.IO adapter is unavailable', async () => {
  const app = buildApp();
  registerReadiness(app, {
    cluster: () => ({ required: true, ready: false, redis: 'unavailable', socketIo: 'ok' })
  });
  const res = responseRecorder();
  await app.routes.get('/api/health/ready')({}, res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, {
    status: 'degraded', database: 'ok', redis: 'unavailable', socketIo: 'ok'
  });
});

test('cluster readiness returns 200 after Redis and Socket.IO adapter recover', async () => {
  const app = buildApp();
  registerReadiness(app, {
    cluster: () => ({ required: true, ready: true, redis: 'ok', socketIo: 'ok' })
  });
  const res = responseRecorder();
  await app.routes.get('/api/health/ready')({}, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'ok', database: 'ok', redis: 'ok', socketIo: 'ok'
  });
});

test('liveness remains 200 without touching the database', async () => {
  const app = buildApp();
  let databaseTouched = false;
  registerPublicRoutes(app, {
    getAsync: async () => { databaseTouched = true; throw new Error('database unavailable'); },
    allAsync: async () => []
  });
  const res = responseRecorder();
  await app.routes.get('/api/health')({}, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.service, 'foodflow');
  assert.equal(databaseTouched, false);
});

test('readiness and liveness paths have a single owner each', () => {
  const app = buildApp();
  registerReadiness(app);
  registerPublicRoutes(app, { getAsync: async () => null, allAsync: async () => [] });
  assert.equal(app.registrations.filter(route => route.path === '/api/health').length, 1);
  assert.equal(app.registrations.filter(route => route.path === '/api/health/ready').length, 1);
  assert.equal(typeof app.routes.get('/api/health'), 'function');
  assert.equal(typeof app.routes.get('/api/health/ready'), 'function');
});
