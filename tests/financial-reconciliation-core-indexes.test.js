'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ensureFinancialReconciliationCoreIndexes
} = require('../server/db/migrations/financial-reconciliation-core-indexes');

const schemas = {
  financial_reconciliation_batches: [
    'id','merchant_id','store_id','provider_code','external_batch_id','statement_sha256',
    'currency_code','row_count','total_debit_minor','total_credit_minor','status',
    'imported_at','validated_at','closed_at'
  ],
  financial_reconciliation_items: [
    'id','batch_id','merchant_id','store_id','row_no','external_reference','transaction_reference',
    'direction','amount_minor','currency_code','occurred_at','description','row_sha256','match_status',
    'match_reason','matched_journal_transaction_id','exception_category','exception_note','created_at'
  ],
  financial_reconciliation_review_events: [
    'id','merchant_id','store_id','batch_id','item_id','journal_transaction_id','exception_category',
    'actor_admin_id','actor_username','action','reason','idempotency_key','request_sha256',
    'before_json','after_json','previous_hash','event_hash','created_at'
  ]
};

const notNull = new Set([
  'id','merchant_id','store_id','batch_id','item_id','provider_code','external_batch_id','row_no',
  'actor_admin_id','actor_username','action','reason','idempotency_key','request_sha256',
  'before_json','after_json','event_hash','created_at','statement_sha256','currency_code',
  'row_count','total_debit_minor','total_credit_minor','status','external_reference',
  'transaction_reference','direction','amount_minor','occurred_at','description','row_sha256','match_status'
]);

function indexRows(name, columns, nonUnique = 0) {
  return columns.map((Column_name, index) => ({
    Key_name: name, Non_unique: nonUnique, Seq_in_index: index + 1, Column_name, Sub_part: null
  }));
}

function fixture({ indexes = {}, duplicates = {}, overrides = {} } = {}) {
  const current = Object.fromEntries(Object.entries(indexes).map(([table, rows]) => [table, rows.map(row => ({ ...row }))]));
  const reads = [];
  const writes = [];
  const allAsync = async sql => {
    reads.push(sql);
    if (sql.startsWith('SELECT ENGINE FROM information_schema.TABLES')) return [{ ENGINE: 'InnoDB' }];
    const columnMatch = sql.match(/^SHOW COLUMNS FROM ([A-Za-z0-9_]+)$/);
    if (columnMatch) {
      const table = columnMatch[1];
      const names = overrides[table] || schemas[table];
      return names.map(Field => ({
        Field,
        Null: overrides[table + ':nullable']?.includes(Field) ? 'YES' :
          (overrides[table + ':notNullable']?.includes(Field) ? 'NO' : (notNull.has(Field) ? 'NO' : 'YES'))
      }));
    }
    const indexMatch = sql.match(/^SHOW INDEX FROM ([A-Za-z0-9_]+)$/);
    if (indexMatch) return current[indexMatch[1]] || [];
    if (sql.includes('GROUP BY')) {
      const table = sql.match(/FROM ([A-Za-z0-9_]+)/)[1];
      return duplicates[table] || [];
    }
    throw new Error('unexpected SQL: ' + sql);
  };
  const runAsync = async sql => {
    writes.push(sql);
    const match = sql.match(/^CREATE UNIQUE INDEX ([A-Za-z0-9_]+) ON ([A-Za-z0-9_]+) \(([^)]+)\)$/);
    if (match) {
      const columns = match[3].split(',').map(value => value.trim());
      current[match[2]] = indexRows(match[1], columns);
    }
    return { affectedRows: 0 };
  };
  return {
    run: () => ensureFinancialReconciliationCoreIndexes({ runAsync, allAsync }),
    reads, writes, current
  };
}

const expectedIndexes = {
  financial_reconciliation_batches: indexRows('unique_reconciliation_batch',
    ['merchant_id','store_id','provider_code','external_batch_id']),
  financial_reconciliation_items: indexRows('unique_reconciliation_row', ['batch_id','row_no']),
  financial_reconciliation_review_events: indexRows('unique_finance_review_idempotency',
    ['merchant_id','store_id','batch_id','idempotency_key'])
};

test('accepts complete audit schema and exact existing import/review uniqueness constraints', async () => {
  const db = fixture({ indexes: expectedIndexes });
  await db.run();
  assert.deepEqual(db.writes, []);
});

test('repairs missing import-row and review idempotency indexes on an existing schema', async () => {
  const db = fixture();
  await db.run();
  assert.equal(db.writes.filter(sql => sql.startsWith('CREATE UNIQUE INDEX')).length, 3);
  await db.run();
  assert.equal(db.writes.filter(sql => sql.startsWith('CREATE UNIQUE INDEX')).length, 3);
});

test('fails closed when immutable review audit columns are missing', async () => {
  const db = fixture({ indexes: expectedIndexes, overrides: {
    financial_reconciliation_review_events: schemas.financial_reconciliation_review_events.filter(name => name !== 'after_json')
  }});
  await assert.rejects(db.run(), error => error.code === 'FINANCE_REVIEW_EVENT_SCHEMA_INCOMPLETE');
  assert.deepEqual(db.writes, []);
});

test('fails closed when a required before/after audit field is nullable', async () => {
  const db = fixture({ indexes: expectedIndexes, overrides: {
    'financial_reconciliation_review_events:nullable': ['before_json']
  }});
  await assert.rejects(db.run(), error => error.code === 'FINANCE_REVIEW_EVENT_SCHEMA_NULLABILITY_DRIFT');
  assert.deepEqual(db.writes, []);
});

test('preserves nullable journal, exception and chain-root fields', async () => {
  const db = fixture({ indexes: expectedIndexes, overrides: {
    'financial_reconciliation_review_events:notNullable': ['journal_transaction_id']
  }});
  await assert.rejects(db.run(), error => error.code === 'FINANCE_REVIEW_EVENT_SCHEMA_NULLABILITY_DRIFT');
  assert.deepEqual(db.writes, []);
});

test('fails closed when a legacy batch import key is duplicated', async () => {
  const db = fixture({ duplicates: {
    financial_reconciliation_batches: [{ merchant_id: 4, store_id: 9, provider_code: 'generic', external_batch_id: 'dup', duplicate_count: 2 }]
  }});
  await assert.rejects(db.run(), error => error.code === 'FINANCE_SCHEMA_DUPLICATE_DATA');
  assert.deepEqual(db.writes, []);
});

test('fails closed when an existing review idempotency index has drifted', async () => {
  const drifted = { ...expectedIndexes, financial_reconciliation_review_events:
    indexRows('unique_finance_review_idempotency', ['store_id','merchant_id','batch_id','idempotency_key']) };
  const db = fixture({ indexes: drifted });
  await assert.rejects(db.run(), error => error.code === 'FINANCE_SCHEMA_INDEX_DRIFT');
  assert.deepEqual(db.writes, []);
});
