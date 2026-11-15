'use strict';
const { parsePositiveRouteId } = require('./route-id');
async function resolveAdminStoreAccess({ getAsync, allAsync, adminId, merchantId, requestedStoreId = null }) {
  if (typeof getAsync !== 'function' || typeof allAsync !== 'function') throw new TypeError('admin store access requires database readers');
  const admin = await getAsync('SELECT id, merchant_id FROM merchant_admins WHERE id=? AND merchant_id=? AND active=1', [adminId, merchantId]);
  if (!admin) return { error: '管理员账号已停用或不存在', code: 'ADMIN_NOT_ACTIVE' };
  const primary = await getAsync('SELECT MIN(id) AS min_id FROM merchant_admins WHERE merchant_id=?', [merchantId]);
  if (Number(primary?.min_id) === Number(adminId)) {
    const store = requestedStoreId
      ? await getAsync('SELECT id FROM stores WHERE id=? AND merchant_id=? AND active=1', [requestedStoreId, merchantId])
      : await getAsync('SELECT id FROM stores WHERE merchant_id=? AND active=1 ORDER BY id ASC LIMIT 1', [merchantId]);
    if (!store) return { error: '商户没有可用门店，或指定门店不存在/已停用', code: 'STORE_NOT_AVAILABLE', status: 403 };
    return { storeId: Number(store.id), isPrimary: true };
  }
  const stores = await allAsync('SELECT s.id FROM merchant_admin_store_access a JOIN stores s ON s.id=a.store_id AND s.merchant_id=a.merchant_id AND s.active=1 WHERE a.admin_id=? AND a.merchant_id=? ORDER BY s.id ASC', [adminId, merchantId]);
  if (requestedStoreId) {
    if (!stores.some(store => Number(store.id) === Number(requestedStoreId))) return { error: '当前管理员未获授权访问该门店', code: 'STORE_NOT_ASSIGNED', status: 403 };
    return { storeId: Number(requestedStoreId), isPrimary: false };
  }
  if (!stores.length) return { error: '当前管理员没有已分配的有效门店', code: 'NO_ASSIGNED_ACTIVE_STORE', status: 403 };
  return { storeId: Number(stores[0].id), isPrimary: false };
}
function normalizeStoreIds(values) {
  if (!Array.isArray(values) || values.length === 0) throw Object.assign(new Error('至少需要分配一个门店'), { status: 400 });
  const ids = values.map(value => parsePositiveRouteId(value));
  if (ids.some(id => id === null) || new Set(ids).size !== ids.length) throw Object.assign(new Error('门店授权列表包含无效或重复编号'), { status: 400 });
  return ids;
}
async function assertTargetAdminInActorScope({ getAsync, allAsync, actorAdminId, targetAdminId, merchantId }) {
  const primary = await getAsync('SELECT MIN(id) AS min_id FROM merchant_admins WHERE merchant_id=?', [merchantId]);
  if (Number(primary?.min_id) === Number(actorAdminId)) return true;
  if (Number(primary?.min_id) === Number(targetAdminId)) return true;
  const [actorRows, targetRows] = await Promise.all([
    allAsync('SELECT store_id FROM merchant_admin_store_access WHERE admin_id=? AND merchant_id=?', [actorAdminId, merchantId]),
    allAsync('SELECT store_id FROM merchant_admin_store_access WHERE admin_id=? AND merchant_id=?', [targetAdminId, merchantId])
  ]);
  const actorStores = new Set((actorRows || []).map(row => Number(row.store_id)));
  if (!(targetRows || []).some(row => actorStores.has(Number(row.store_id)))) {
    throw Object.assign(new Error('不能管理授权范围之外的管理员账号'), { status: 403 });
  }
  return true;
}

async function assertAdminStoreAssignment({ allAsync, adminId, merchantId, storeId }) {
  const rows = await allAsync(
    'SELECT store_id FROM merchant_admin_store_access WHERE admin_id=? AND merchant_id=? AND store_id=?',
    [adminId, merchantId, storeId]
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error('当前管理员未获授权管理该门店'), { status: 403, statusCode: 403 });
  }
  return true;
}

async function assertActorCanAssignStores({ getAsync, allAsync, actorAdminId, merchantId, storeIds }) {
  if (!actorAdminId) throw Object.assign(new Error('缺少管理员身份，不能分配门店权限'), { status: 403 });
  const primary = await getAsync('SELECT MIN(id) AS min_id FROM merchant_admins WHERE merchant_id=?', [merchantId]);
  if (Number(primary?.min_id) === Number(actorAdminId)) return true;
  const assigned = await allAsync(
    'SELECT s.id FROM merchant_admin_store_access a JOIN stores s ON s.id=a.store_id AND s.merchant_id=a.merchant_id AND s.active=1 WHERE a.admin_id=? AND a.merchant_id=?',
    [actorAdminId, merchantId]
  );
  const allowed = new Set(assigned.map(row => Number(row.id)));
  if (storeIds.some(id => !allowed.has(Number(id)))) {
    throw Object.assign(new Error('不能将自己未获授权的门店分配给其他管理员'), { status: 403 });
  }
  return true;
}

async function replaceAdminStoreAccess({ runAsync, allAsync, adminId, merchantId, storeIds }) {
  const ids = normalizeStoreIds(storeIds);
  const stores = await allAsync('SELECT id FROM stores WHERE merchant_id=? AND active=1 AND id IN (' + ids.map(() => '?').join(',') + ')', [merchantId, ...ids]);
  if (stores.length !== ids.length) throw Object.assign(new Error('授权门店必须属于当前商户且处于启用状态'), { status: 400 });
  await runAsync('DELETE FROM merchant_admin_store_access WHERE admin_id=? AND merchant_id=?', [adminId, merchantId]);
  for (const storeId of ids) await runAsync('INSERT INTO merchant_admin_store_access (merchant_id, admin_id, store_id, created_at) VALUES (?, ?, ?, NOW(3))', [merchantId, adminId, storeId]);
  return ids;
}
module.exports = { resolveAdminStoreAccess, normalizeStoreIds, assertAdminStoreAssignment, assertTargetAdminInActorScope, assertActorCanAssignStores, replaceAdminStoreAccess };
