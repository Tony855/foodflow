'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ensureFinancialReconciliationAssignmentIndex,
  INDEX_NAME,
  INDEX_COLUMN
} = require('../server/db/migrations/financial-reconciliation-assignment-index');

const correctIndex = (name = INDEX_NAME) => ({
  Key_name: name,
  Non_unique: 0,
  Seq_in_index: 1,
  Column_name: INDEX_COLUMN,
  Sub_part: null
});

function fixture({ columns = ['id', INDEX_COLUMN], indexes = [], duplicate = null, createError = null, onCreateError } = {}) {
  let currentIndexes = indexes.map(row => ({ ...row }));
  const writes = [];
  const reads = [];
  const allAsync = async sql => {
    reads.push(sql);
    if (sql === 'SHOW COLUMNS FROM financial_reconciliation_items') {
      return columns.map(Field => ({ Field }));
    }
    if (sql === 'SHOW INDEX FROM financial_reconciliation_items') return currentIndexes.map(row => ({ ...row }));
    throw new Error('unexpected allAsync SQL: ' + sql);
  };
  const getAsync = async sql => {
    reads.push(sql);
    if (!sql.includes('GROUP BY matched_journal_transaction_id')) {
      throw new Error('unexpected getAsync SQL: ' + sql);
    }
    return duplicate;
  };
  const runAsync = async sql => {
    writes.push(sql);
    if (createError) {
      if (onCreateError) currentIndexes = onCreateError().map(row => ({ ...row }));
      throw createError;
    }
    currentIndexes = [correctIndex()];
    return { affectedRows: 0 };
  };
  return {
    run: () => ensureFinancialReconciliationAssignmentIndex({ runAsync, getAsync, allAsync }),
    writes,
    reads,
    get indexes() { return currentIndexes; }
  };
}

test('creates the one-column unique assignment index for a populated legacy schema', async () => {
  const db = fixture();
  assert.deepEqual(await db.run(), { created: true, indexName: INDEX_NAME });
  assert.deepEqual(db.writes, [
    'CREATE UNIQUE INDEX ' + INDEX_NAME +
    ' ON financial_reconciliation_items (' + INDEX_COLUMN + ')'
  ]);
  assert.equal(db.indexes.length, 1);
});

test('accepts an existing exact unique assignment index and is idempotent', async () => {
  const db = fixture({ indexes: [correctIndex()] });
  assert.deepEqual(await db.run(), { created: false, indexName: INDEX_NAME });
  assert.deepEqual(db.writes, []);
});

test('fails closed when the expected index name is present with a non-unique definition', async () => {
  const db = fixture({ indexes: [{ ...correctIndex(), Non_unique: 1 }] });
  await assert.rejects(db.run(), /unexpected definition/);
  assert.deepEqual(db.writes, []);
});

test('fails closed when the expected index name points at the wrong column', async () => {
  const db = fixture({ indexes: [{ ...correctIndex(), Column_name: 'id' }] });
  await assert.rejects(db.run(), /unexpected definition/);
  assert.deepEqual(db.writes, []);
});

test('fails closed on duplicate legacy assignments before attempting DDL', async () => {
  const db = fixture({ duplicate: { matched_journal_transaction_id: 31, assignment_count: 2 } });
  await assert.rejects(db.run(), /duplicate journal assignments/);
  assert.deepEqual(db.writes, []);
  assert.equal(db.reads.some(sql => sql === 'SHOW INDEX FROM financial_reconciliation_items'), false);
});

test('recognizes an equivalent single-column unique index under another name', async () => {
  const db = fixture({ indexes: [correctIndex('uq_legacy_journal_assignment')] });
  assert.deepEqual(await db.run(), { created: false, indexName: 'uq_legacy_journal_assignment' });
  assert.deepEqual(db.writes, []);
});

test('accepts a concurrent startup winner only after validating its index definition', async () => {
  const race = new Error('Duplicate key name');
  race.code = 'ER_DUP_KEYNAME';
  const db = fixture({ createError: race, onCreateError: () => [correctIndex()] });
  assert.deepEqual(await db.run(), { created: false, indexName: INDEX_NAME });
});

test('does not hide unrelated DDL errors', async () => {
  const failure = new Error('disk is full');
  failure.code = 'ER_DISK_FULL';
  const db = fixture({ createError: failure });
  await assert.rejects(db.run(), error => error === failure);
});

test('rejects a legacy table missing the assignment column', async () => {
  const db = fixture({ columns: ['id'] });
  await assert.rejects(db.run(), /is missing matched_journal_transaction_id/);
  assert.deepEqual(db.writes, []);
});
