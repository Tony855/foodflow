'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAdminStoreAccess, normalizeStoreIds, assertActorCanAssignStores } = require('../server/services/admin-store-access');
function db({ primaryId = 1, stores = [10, 11], assigned = [10] } = {}) {
  return {
    getAsync: async (sql, params = []) => {
      if (sql.includes('FROM merchant_admins WHERE id=')) return { id: Number(params[0]), merchant_id: 7 };
      if (sql.includes('MIN(id)')) return { min_id: primaryId };
      if (sql.includes('FROM stores WHERE id=')) return stores.includes(Number(params[0])) ? { id: Number(params[0]) } : null;
      if (sql.includes('FROM stores WHERE merchant_id=')) return stores.length ? { id: stores[0] } : null;
      return null;
    },
    allAsync: async sql => sql.includes('merchant_admin_store_access') ? assigned.map(id => ({ id, store_id: id })) : []
  };
}
test('primary admin retains access to any active merchant store', async () => {
  const deps = db({ primaryId: 5, stores: [10, 11] });
  assert.deepEqual(await resolveAdminStoreAccess({ ...deps, adminId: 5, merchantId: 7, requestedStoreId: 11 }), { storeId: 11, isPrimary: true });
});
test('sub-admin defaults only to first assigned active store', async () => {
  const deps = db({ primaryId: 1, assigned: [11] });
  assert.deepEqual(await resolveAdminStoreAccess({ ...deps, adminId: 5, merchantId: 7 }), { storeId: 11, isPrimary: false });
});
test('sub-admin cannot select another store owned by same merchant without assignment', async () => {
  const deps = db({ primaryId: 1, assigned: [10] });
  const result = await resolveAdminStoreAccess({ ...deps, adminId: 5, merchantId: 7, requestedStoreId: 11 });
  assert.equal(result.code, 'STORE_NOT_ASSIGNED');
  assert.equal(result.status, 403);
});
test('sub-admin with no active assignments fails closed', async () => {
  const deps = db({ primaryId: 1, assigned: [] });
  assert.equal((await resolveAdminStoreAccess({ ...deps, adminId: 5, merchantId: 7 })).code, 'NO_ASSIGNED_ACTIVE_STORE');
});
test('store assignment lists reject empty, invalid and duplicate ids', () => {
  assert.throws(() => normalizeStoreIds([]), /至少需要/);
  assert.throws(() => normalizeStoreIds([1, '1']), /无效或重复/);
  assert.throws(() => normalizeStoreIds(['1x']), /无效或重复/);
  assert.deepEqual(normalizeStoreIds([1, '2']), [1, 2]);
});


test('sub-admin cannot delegate a store outside their own assignments', async () => {
  const deps = db({ primaryId: 1, assigned: [10] });
  await assert.rejects(
    () => assertActorCanAssignStores({ ...deps, actorAdminId: 5, merchantId: 7, storeIds: [11] }),
    error => error.status === 403
  );
});
test('primary admin can delegate any active store belonging to the merchant', async () => {
  const deps = db({ primaryId: 5, stores: [10, 11] });
  assert.equal(await assertActorCanAssignStores({ ...deps, actorAdminId: 5, merchantId: 7, storeIds: [10, 11] }), true);
});
