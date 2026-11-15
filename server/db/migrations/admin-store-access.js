'use strict';
const ADMIN_STORE_ACCESS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS merchant_admin_store_access (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 merchant_id INT NOT NULL,
 admin_id INT NOT NULL,
 store_id INT NOT NULL,
 created_at DATETIME(3) NOT NULL,
 PRIMARY KEY (id),
 UNIQUE KEY uq_admin_store_access (admin_id, store_id),
 KEY idx_admin_store_access_merchant (merchant_id, admin_id),
 KEY idx_admin_store_access_store (merchant_id, store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;
async function ensureAdminStoreAccessSchema({ getAsync, runAsync, logger = console }) {
 if (typeof getAsync !== 'function' || typeof runAsync !== 'function') throw new TypeError('ensureAdminStoreAccessSchema requires getAsync and runAsync');
 await runAsync(ADMIN_STORE_ACCESS_SCHEMA_SQL);
 const marker = await getAsync("SELECT value FROM settings WHERE `key`=?", ['migration_admin_store_access_backfill_v1']);
 if (marker?.value === '1') return { changed: false, backfilled: false };
 await runAsync(`
 INSERT IGNORE INTO merchant_admin_store_access (merchant_id, admin_id, store_id, created_at)
 SELECT ma.merchant_id, ma.id, s.id, NOW(3)
 FROM merchant_admins ma JOIN stores s ON s.merchant_id=ma.merchant_id AND s.active=1
 WHERE ma.active=1 AND ma.id <> (
  SELECT MIN(primary_admin.id) FROM merchant_admins primary_admin WHERE primary_admin.merchant_id=ma.merchant_id
 )
 `);
 await runAsync("INSERT INTO settings (`key`, value) VALUES (?, '1') ON DUPLICATE KEY UPDATE value='1'", ['migration_admin_store_access_backfill_v1']);
 if (logger?.log) logger.log('  + 迁移 merchant_admin_store_access: 已一次性兼容现有子管理员门店权限');
 return { changed: true, backfilled: true };
}
module.exports = { ADMIN_STORE_ACCESS_SCHEMA_SQL, ensureAdminStoreAccessSchema };
