'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureFinanceUniqueIndex, isExactUniqueIndex } = require('../server/db/migrations/finance-unique-index');

function indexRows(name, columns, options = {}) {
  return columns.map((Column_name, index) => ({
    Key_name: name,
    Non_unique: options.nonUnique === undefined ? 0 : options.nonUnique,
    Seq_in_index: index + 1,
    Column_name,
    Sub_part: options.subPart === undefined ? null : options.subPart
  }));
}

function fixture({
  tableName = 'finance_events',
  indexName = 'unique_finance_event',
  columns = ['merchant_id', 'store_id', 'idempotency_key'],
  indexes = [],
  duplicates = [],
  createError = null,
  afterRaceIndexes = [],
  nullableColumns = [],
  engine = 'InnoDB',
  missingTable = false
} = {}) {
  let currentIndexes = indexes.map(row => ({ ...row }));
  const reads = [];
  const writes = [];
  const allAsync = async sql => {
    reads.push(sql);
    if (sql.startsWith('SELECT ENGINE FROM information_schema.TABLES')) {
      return missingTable ? [] : [{ ENGINE: engine }];
    }
    if (sql === 'SHOW COLUMNS FROM ' + tableName) {
      return columns.map(Field => ({ Field, Null: nullableColumns.includes(Field) ? 'YES' : 'NO' }));
    }
    if (sql === 'SHOW INDEX FROM ' + tableName) return currentIndexes.map(row => ({ ...row }));
    if (sql.includes('FROM ' + tableName) && sql.includes('GROUP BY')) return duplicates;
    throw new Error('unexpected SQL: ' + sql);
  };
  const runAsync = async sql => {
    writes.push(sql);
    if (createError) {
      currentIndexes = afterRaceIndexes.map(row => ({ ...row }));
      throw createError;
    }
    currentIndexes = indexRows(indexName, columns);
    return { affectedRows: 0 };
  };
  return {
    run: () => ensureFinanceUniqueIndex({
      runAsync, allAsync, tableName, indexName, columns,
      duplicateMessage: 'duplicate legacy finance rows'
    }),
    reads,
    writes,
    get indexes() { return currentIndexes; }
  };
}

test('creates a missing unique index after checking populated legacy rows', async () => {
  const db = fixture();
  assert.deepEqual(await db.run(), { created: true, indexName: 'unique_finance_event' });
  assert.equal(db.writes.length, 1);
  assert.match(db.writes[0], /CREATE UNIQUE INDEX unique_finance_event/);
  assert.ok(db.reads.some(sql => sql.includes('GROUP BY merchant_id, store_id, idempotency_key')));
  assert.equal(isExactUniqueIndex(db.indexes, ['merchant_id', 'store_id', 'idempotency_key']), true);
});

test('recognizes an existing exact unique index and is idempotent', async () => {
  const db = fixture({ indexes: indexRows('unique_finance_event', ['merchant_id', 'store_id', 'idempotency_key']) });
  assert.deepEqual(await db.run(), { created: false, indexName: 'unique_finance_event' });
  assert.deepEqual(db.writes, []);
  assert.equal(db.reads.some(sql => sql.includes('GROUP BY')), false);
});

test('accepts an equivalent exact unique index under a legacy name', async () => {
  const db = fixture({ indexes: indexRows('uq_legacy_finance_event', ['merchant_id', 'store_id', 'idempotency_key']) });
  assert.deepEqual(await db.run(), { created: false, indexName: 'uq_legacy_finance_event' });
  assert.deepEqual(db.writes, []);
});

test('fails closed when the expected index name is non-unique', async () => {
  const db = fixture({ indexes: indexRows('unique_finance_event', ['merchant_id', 'store_id', 'idempotency_key'], { nonUnique: 1 }) });
  await assert.rejects(db.run(), error => error.code === 'FINANCE_SCHEMA_INDEX_DRIFT');
  assert.deepEqual(db.writes, []);
});

test('fails closed when the expected index name has the wrong column order', async () => {
  const db = fixture({ indexes: indexRows('unique_finance_event', ['store_id', 'merchant_id', 'idempotency_key']) });
  await assert.rejects(db.run(), error => error.code === 'FINANCE_SCHEMA_INDEX_DRIFT');
  assert.deepEqual(db.writes, []);
});

test('does not accept prefix indexes as an exact uniqueness constraint', async () => {
  const db = fixture({ indexes: indexRows('uq_prefix', ['merchant_id', 'store_id', 'idempotency_key'], { subPart: 12 }) });
  await db.run();
  assert.equal(db.writes.length, 1);
});

test('fails closed on duplicate legacy rows before attempting DDL', async () => {
  const db = fixture({ duplicates: [{ merchant_id: 4, store_id: 9, idempotency_key: 'duplicate', duplicate_count: 2 }] });
  await assert.rejects(db.run(), error =>
    error.code === 'FINANCE_SCHEMA_DUPLICATE_DATA' && /duplicate legacy finance rows/.test(error.message)
  );
  assert.deepEqual(db.writes, []);
});

test('accepts a concurrent startup winner only after re-reading the exact index', async () => {
  const race = new Error('Duplicate key name');
  race.code = 'ER_DUP_KEYNAME';
  const db = fixture({
    createError: race,
    afterRaceIndexes: indexRows('unique_finance_event', ['merchant_id', 'store_id', 'idempotency_key'])
  });
  assert.deepEqual(await db.run(), { created: false, indexName: 'unique_finance_event' });
});

test('rejects unsafe SQL identifiers before issuing database queries', async () => {
  const db = fixture({ tableName: 'finance_events; DROP TABLE users' });
  await assert.rejects(db.run(), /simple SQL identifier/);
  assert.deepEqual(db.reads, []);
  assert.deepEqual(db.writes, []);
});

test('fails closed when any uniqueness-key column is nullable', async () => {
  const db = fixture({ nullableColumns: ['idempotency_key'] });
  await assert.rejects(db.run(), error => error.code === 'FINANCE_SCHEMA_NULLABLE_KEY_COLUMN');
  assert.equal(db.reads.length, 2, 'engine and column metadata are checked before index inspection');
  assert.equal(db.reads.some(sql => sql.startsWith('SHOW INDEX FROM')), false);
  assert.deepEqual(db.writes, []);
});

test('fails closed when a legacy finance table is not transactional InnoDB', async () => {
  const db = fixture({ engine: 'MyISAM' });
  await assert.rejects(db.run(), error => error.code === 'FINANCE_SCHEMA_NON_TRANSACTIONAL_ENGINE');
  assert.equal(db.reads.length, 1, 'engine drift is rejected before column/index inspection');
  assert.deepEqual(db.writes, []);
});

test('fails closed when the expected finance table is absent', async () => {
  const db = fixture({ missingTable: true });
  await assert.rejects(db.run(), error => error.code === 'FINANCE_SCHEMA_TABLE_MISSING');
  assert.equal(db.reads.length, 1);
  assert.deepEqual(db.writes, []);
});
