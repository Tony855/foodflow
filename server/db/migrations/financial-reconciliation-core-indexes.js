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

function schemaError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
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
  REVIEW_EVENT_REQUIRED_COLUMNS,
  REVIEW_EVENT_REQUIRED_NON_NULL_COLUMNS,
  REVIEW_EVENT_REQUIRED_NULLABLE_COLUMNS
};
