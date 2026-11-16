'use strict';

const OUTBOX_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS telegram_notification_outbox (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_key VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    event_type VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    merchant_id BIGINT UNSIGNED DEFAULT NULL,
    store_id BIGINT UNSIGNED DEFAULT NULL,
    recipient_scope ENUM('system_admin','merchant_store','customer') NOT NULL,
    recipient_key VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    payload_json JSON NOT NULL,
    state ENUM('pending','processing','sending','delivered','uncertain','dead') NOT NULL DEFAULT 'pending',
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    available_at DATETIME(3) NOT NULL,
    locked_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
    locked_until DATETIME(3) DEFAULT NULL,
    delivered_at DATETIME(3) DEFAULT NULL,
    telegram_message_id BIGINT UNSIGNED DEFAULT NULL,
    last_error_code VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_telegram_outbox_scoped_event (event_key, event_type, recipient_scope, merchant_id, store_id),
    KEY idx_telegram_outbox_claim (state, available_at, locked_until, id),
    KEY idx_telegram_outbox_tenant (merchant_id, store_id, created_at),
    KEY idx_telegram_outbox_recipient (recipient_scope, recipient_key, state)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

async function ensureTelegramNotificationOutboxSchema({ runAsync, getAsync }) {
  if (typeof runAsync !== 'function' || typeof getAsync !== 'function') {
    throw new TypeError('runAsync and getAsync are required');
  }
  await runAsync(OUTBOX_SCHEMA_SQL);
  await runAsync("ALTER TABLE telegram_notification_outbox MODIFY COLUMN state ENUM('pending','processing','sending','delivered','uncertain','dead') NOT NULL DEFAULT 'pending'");
  const messageIdColumn = await getAsync(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    ['telegram_notification_outbox', 'telegram_message_id']
  );
  if (!messageIdColumn) {
    await runAsync('ALTER TABLE telegram_notification_outbox ADD COLUMN telegram_message_id BIGINT UNSIGNED DEFAULT NULL AFTER delivered_at');
  }

  // Upgrade existing installations from the former global event_key unique
  // index. The tenant + event type + recipient scope now form the dedupe scope.
  const legacyIndex = await getAsync(
    'SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?',
    ['telegram_notification_outbox', 'uq_telegram_outbox_event']
  );
  if (legacyIndex) await runAsync('ALTER TABLE telegram_notification_outbox DROP INDEX uq_telegram_outbox_event');

  const scopedIndex = await getAsync(
    'SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?',
    ['telegram_notification_outbox', 'uq_telegram_outbox_scoped_event']
  );
  if (!scopedIndex) {
    await runAsync('ALTER TABLE telegram_notification_outbox ADD UNIQUE KEY uq_telegram_outbox_scoped_event (event_key, event_type, recipient_scope, merchant_id, store_id)');
  }
}

module.exports = { OUTBOX_SCHEMA_SQL, ensureTelegramNotificationOutboxSchema };
