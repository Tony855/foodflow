'use strict';

const INDEX_NAME = 'unique_reconciliation_journal_assignment';
const INDEX_COLUMN = 'matched_journal_transaction_id';

function isExactSingleColumnUniqueIndex(rows) {
  return rows.length === 1 &&
    Number(rows[0].Non_unique) === 0 &&
    Number(rows[0].Seq_in_index) === 1 &&
    rows[0].Column_name === INDEX_COLUMN &&
    (rows[0].Sub_part === null || rows[0].Sub_part === undefined);
}

function groupIndexesByName(indexes) {
  const groups = new Map();
  for (const index of indexes) {
    const name = String(index.Key_name || '');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(index);
  }
  return groups;
}

function findEquivalentUniqueIndex(indexes) {
  for (const [name, rows] of groupIndexesByName(indexes)) {
    if (isExactSingleColumnUniqueIndex(rows)) return name;
  }
  return null;
}

async function ensureFinancialReconciliationAssignmentIndex({ runAsync, getAsync, allAsync }) {
  for (const [name, fn] of Object.entries({ runAsync, getAsync, allAsync })) {
    if (typeof fn !== 'function') throw new TypeError(name + ' is required');
  }

  const columns = await allAsync('SHOW COLUMNS FROM financial_reconciliation_items');
  if (!columns.some(column => column.Field === INDEX_COLUMN)) {
    throw new Error('financial_reconciliation_items is missing ' + INDEX_COLUMN);
  }

  const duplicate = await getAsync(
    'SELECT matched_journal_transaction_id, COUNT(*) AS assignment_count ' +
    'FROM financial_reconciliation_items ' +
    'WHERE matched_journal_transaction_id IS NOT NULL ' +
    'GROUP BY matched_journal_transaction_id HAVING COUNT(*) > 1 LIMIT 1'
  );
  if (duplicate) {
    throw new Error('financial reconciliation has duplicate journal assignments; resolve them before enabling finance review');
  }

  const indexes = await allAsync('SHOW INDEX FROM financial_reconciliation_items');
  const named = indexes.filter(index => index.Key_name === INDEX_NAME);
  if (named.length) {
    if (!isExactSingleColumnUniqueIndex(named)) {
      throw new Error('financial reconciliation assignment index exists with an unexpected definition');
    }
    return { created: false, indexName: INDEX_NAME };
  }

  const equivalentName = findEquivalentUniqueIndex(indexes);
  if (equivalentName) return { created: false, indexName: equivalentName };

  try {
    await runAsync(
      'CREATE UNIQUE INDEX ' + INDEX_NAME +
      ' ON financial_reconciliation_items (' + INDEX_COLUMN + ')'
    );
  } catch (error) {
    // Multiple application instances may run startup migrations concurrently.
    // Only treat a duplicate index-name race as success after re-reading and
    // validating the exact index that won the race.
    if (error?.code !== 'ER_DUP_KEYNAME' && Number(error?.errno) !== 1061) throw error;
    const afterRace = await allAsync('SHOW INDEX FROM financial_reconciliation_items');
    const racedIndex = afterRace.filter(index => index.Key_name === INDEX_NAME);
    if (!isExactSingleColumnUniqueIndex(racedIndex)) throw error;
    return { created: false, indexName: INDEX_NAME };
  }

  return { created: true, indexName: INDEX_NAME };
}

module.exports = {
  ensureFinancialReconciliationAssignmentIndex,
  INDEX_NAME,
  INDEX_COLUMN
};
