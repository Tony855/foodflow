'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { assertTableExists } = require('../server/services/order');

test('assertTableExists loads getAsync lazily and validates the requested store table', async () => {
  const originalLoad = Module._load;
  const calls = [];
  Module._load = function(request, parent, isMain) {
    if (request === '../db/helpers' && parent && parent.filename.endsWith('/server/services/order.js')) {
      return {
        getAsync: async (sql, params) => {
          calls.push({ sql, params });
          return { name: 'A1' };
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    assert.equal(await assertTableExists(' A1 ', 7), 'A1');
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /FROM tables t JOIN stores s/);
    assert.deepEqual(calls[0].params, ['A1', 7]);
  } finally {
    Module._load = originalLoad;
  }
});

test('assertTableExists rejects an empty table before loading database helpers', async () => {
  await assert.rejects(assertTableExists('  ', 7), /请选择桌号/);
});
