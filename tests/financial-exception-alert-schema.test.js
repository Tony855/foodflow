'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureFinancialExceptionAlertSchema } = require('../server/db/migrations/financial-exception-alerts');

const alertColumns = [
  'id','merchant_id','store_id','batch_id','item_id','alert_type','sla_hours','status','generated_at',
  'acknowledged_by_admin_id','acknowledged_by_username','acknowledged_at','acknowledgement_reason'
];
const eventColumns = [
  'id','alert_id','merchant_id','store_id','actor_admin_id','actor_username','action','reason',
  'idempotency_key','request_sha256','previous_hash','event_hash','created_at'
];
const makeIndexes = (name, columns) => columns.map((Column_name, index) => ({
  Key_name: name, Non_unique: 0, Seq_in_index: index + 1, Column_name, Sub_part: null
}));

test('exception alert migration verifies the exact deduplication and idempotency indexes', async () => {
  const writes = [];
  const allAsync = async sql => {
    if (sql === 'SHOW COLUMNS FROM financial_reconciliation_exception_alerts') return alertColumns.map(Field => ({ Field }));
    if (sql === 'SHOW COLUMNS FROM financial_reconciliation_exception_alert_events') return eventColumns.map(Field => ({ Field }));
    if (sql === 'SHOW INDEX FROM financial_reconciliation_exception_alerts') {
      return makeIndexes('unique_finance_exception_alert', ['merchant_id','store_id','item_id','alert_type','sla_hours']);
    }
    if (sql === 'SHOW INDEX FROM financial_reconciliation_exception_alert_events') {
      return makeIndexes('unique_finance_exception_alert_event', ['alert_id','idempotency_key']);
    }
    throw new Error('unexpected SQL: ' + sql);
  };
  await ensureFinancialExceptionAlertSchema({ runAsync: async sql => writes.push(sql), allAsync });
  assert.equal(writes.length, 2);
  assert.ok(writes.every(sql => /CREATE TABLE IF NOT EXISTS/.test(sql)));
});

test('exception alert migration repairs missing indexes on an existing populated schema', async () => {
  const writes = [];
  const allAsync = async sql => {
    if (sql === 'SHOW COLUMNS FROM financial_reconciliation_exception_alerts') return alertColumns.map(Field => ({ Field }));
    if (sql === 'SHOW COLUMNS FROM financial_reconciliation_exception_alert_events') return eventColumns.map(Field => ({ Field }));
    if (sql === 'SHOW INDEX FROM financial_reconciliation_exception_alerts' ||
        sql === 'SHOW INDEX FROM financial_reconciliation_exception_alert_events') return [];
    if (sql.includes('GROUP BY')) return [];
    throw new Error('unexpected SQL: ' + sql);
  };
  await ensureFinancialExceptionAlertSchema({
    runAsync: async sql => writes.push(sql),
    allAsync
  });
  assert.equal(writes.filter(sql => sql.startsWith('CREATE UNIQUE INDEX')).length, 2);
  assert.ok(writes.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS financial_reconciliation_exception_alerts')));
  assert.ok(writes.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS financial_reconciliation_exception_alert_events')));
});
