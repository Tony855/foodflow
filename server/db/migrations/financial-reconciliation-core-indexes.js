'use strict';

const { ensureFinanceUniqueIndex } = require('./finance-unique-index');

const REVIEW_EVENT_REQUIRED_COLUMNS = Object.freeze([
  'id', 'merchant_id', 'store_id', 'batch_id', 'item_id', 'journal_transaction_id',
  'exception_category', 'actor_admin_id', 'actor_username', 'action', 'reason',
  'idempotency_key', 'request_sha256', 'before_json', 'after_json', 'previous_hash',
  'event_hash', 'created_at'
]);

const REVIEW_EVENT_REQUIRED_NON_NULL_COLUMNS = Object.freeze([
  'id', 'merchant_id', 'store_id', 'batch_id', 'item_id', 'actor_admin_id',
  'actor_username', 'action', 'reason', 'idempotency_key', 'request_sha256',
  'before_json', 'after_json', 'event_hash', 'created_at'
]);

const REVIEW_EVENT_REQUIRED_NULLABLE_COLUMNS = Object.freeze([
  'journal_transaction_id', 'exception_category', 'previous_hash'
]);

const REVIEW_EVENT_ALLOWED_ACTIONS = Object.freeze([
  'confirm', 'reject', 'release', 'reassign', 'classify_exception'
]);

const REVIEW_EVENT_COLUMN_CONTRACTS = Object.freeze({
  id: Object.freeze({ kind: 'auto_increment_id' }),
  actor_username: Object.freeze({ kind: 'string', minLength: 100 }),
  action: Object.freeze({ kind: 'action' }),
  reason: Object.freeze({ kind: 'string', minLength: 500 }),
  idempotency_key: Object.freeze({ kind: 'string', minLength: 128 }),
  request_sha256: Object.freeze({ kind: 'string', minLength: 64 }),
  before_json: Object.freeze({ kind: 'json' }),
  after_json: Object.freeze({ kind: 'json' }),
  previous_hash: Object.freeze({ kind: 'string', minLength: 64 }),
  event_hash: Object.freeze({ kind: 'string', minLength: 64 }),
  created_at: Object.freeze({ kind: 'datetime' })
});

const TEXT_CAPACITY = Object.freeze({
  tinytext: 255,
  text: 65535,
  mediumtext: 16777215,
  longtext: 4294967295
});

function schemaError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function columnTypeBase(type) {
  return String(type || '').trim().toLowerCase().match(/^([a-z]+)/)?.[1] || '';
}

function stringCapacity(type) {
  const normalized = String(type || '').trim().toLowerCase();
  const sized = normalized.match(/^(?:char|varchar)\s*\(\s*(\d+)\s*\)/);
  if (sized) return Number(sized[1]);
  return TEXT_CAPACITY[columnTypeBase(normalized)] || 0;
}

function enumValues(type) {
  const match = String(type || '').trim().match(/^enum\s*\((.*)\)$/i);
  if (!match) return null;
  const values = [];
  const pattern = /'((?:\\.|[^'])*)'/g;
  let item;
  while ((item = pattern.exec(match[1]))) {
    values.push(item[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
  return values;
}

function isReviewEventColumnTypeSafe(name, column, contract) {
  const type = String(column.Type || '').trim().toLowerCase();
  const base = columnTypeBase(type);
  if (!type) return false;

  if (contract.kind === 'auto_increment_id') {
    return /^(tinyint|smallint|mediumint|int|integer|bigint)(?:\s*\(\s*\d+\s*\))?(?:\s+unsigned)?$/i.test(type) &&
      String(column.Key || '').toUpperCase() === 'PRI' &&
      /(?:^|\s)auto_increment(?:\s|$)/i.test(String(column.Extra || ''));
  }

  if (contract.kind === 'string') {
    return stringCapacity(type) >= contract.minLength;
  }

  if (contract.kind === 'action') {
    const values = enumValues(type);
    if (values) return REVIEW_EVENT_ALLOWED_ACTIONS.every(action => values.includes(action));
    return stringCapacity(type) >= Math.max(...REVIEW_EVENT_ALLOWED_ACTIONS.map(action => action.length));
  }

  if (contract.kind === 'json') {
    return base === 'json' || (Object.hasOwn(TEXT_CAPACITY, base) && TEXT_CAPACITY[base] >= 65535);
  }

  if (contract.kind === 'datetime') {
    return base === 'datetime' || base === 'timestamp';
  }

  return false;
}

async function assertReviewEventSchema(allAsync) {
  const rows = await allAsync('SHOW COLUMNS FROM financial_reconciliation_review_events');
  if (!Array.isArray(rows)) throw new TypeError('review event SHOW COLUMNS must return an array');
  const byName = new Map(rows.map(column => [column.Field, column]));
  const missing = REVIEW_EVENT_REQUIRED_COLUMNS.filter(name => !byName.has(name));
  if (missing.length) {
    throw schemaError(
      'FINANCE_REVIEW_EVENT_SCHEMA_INCOMPLETE',
      'financial reconciliation review event schema is incomplete: ' + missing.join(', ')
    );
  }

  const nullable = REVIEW_EVENT_REQUIRED_NON_NULL_COLUMNS.filter(name =>
    String(byName.get(name).Null || '').toUpperCase() !== 'NO'
  );
  if (nullable.length) {
    throw schemaError(
      'FINANCE_REVIEW_EVENT_SCHEMA_NULLABILITY_DRIFT',
      'financial reconciliation review audit columns must be NOT NULL: ' + nullable.join(', ')
    );
  }

  const notNullable = REVIEW_EVENT_REQUIRED_NULLABLE_COLUMNS.filter(name =>
    String(byName.get(name).Null || '').toUpperCase() !== 'YES'
  );
  if (notNullable.length) {
    throw schemaError(
      'FINANCE_REVIEW_EVENT_SCHEMA_NULLABILITY_DRIFT',
      'financial reconciliation review optional columns must remain nullable: ' + notNullable.join(', ')
    );
  }

  const incompatible = Object.entries(REVIEW_EVENT_COLUMN_CONTRACTS)
    .filter(([name, contract]) => !isReviewEventColumnTypeSafe(name, byName.get(name), contract))
    .map(([name]) => name);
  if (incompatible.length) {
    throw schemaError(
      'FINANCE_REVIEW_EVENT_SCHEMA_TYPE_DRIFT',
      'financial reconciliation review event columns have incompatible types or capacity: ' + incompatible.join(', ')
    );
  }
}

async function ensureFinancialReconciliationCoreIndexes({ runAsync, allAsync }) {
  if (typeof runAsync !== 'function' || typeof allAsync !== 'function') {
    throw new TypeError('runAsync and allAsync are required');
  }

  // Validate the audit record shape before making any additive index changes.
  await assertReviewEventSchema(allAsync);

  await ensureFinanceUniqueIndex({
    runAsync, allAsync,
    tableName: 'financial_reconciliation_batches',
    indexName: 'unique_reconciliation_batch',
    columns: ['merchant_id', 'store_id', 'provider_code', 'external_batch_id'],
    duplicateMessage: 'duplicate legacy reconciliation batches must be resolved before migration'
  });
  await ensureFinanceUniqueIndex({
    runAsync, allAsync,
    tableName: 'financial_reconciliation_items',
    indexName: 'unique_reconciliation_row',
    columns: ['batch_id', 'row_no'],
    duplicateMessage: 'duplicate legacy reconciliation rows must be resolved before migration'
  });
  await ensureFinanceUniqueIndex({
    runAsync, allAsync,
    tableName: 'financial_reconciliation_review_events',
    indexName: 'unique_finance_review_idempotency',
    columns: ['merchant_id', 'store_id', 'batch_id', 'idempotency_key'],
    duplicateMessage: 'duplicate financial review event idempotency keys must be resolved before migration'
  });
}

module.exports = {
  ensureFinancialReconciliationCoreIndexes,
  assertReviewEventSchema,
  isReviewEventColumnTypeSafe,
  REVIEW_EVENT_REQUIRED_COLUMNS,
  REVIEW_EVENT_REQUIRED_NON_NULL_COLUMNS,
  REVIEW_EVENT_REQUIRED_NULLABLE_COLUMNS,
  REVIEW_EVENT_ALLOWED_ACTIONS,
  REVIEW_EVENT_COLUMN_CONTRACTS
};
