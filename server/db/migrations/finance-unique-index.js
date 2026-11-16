'use strict';

const IDENTIFIER_RE = /^[A-Za-z0-9_]+$/;

function assertIdentifier(value, name) {
  if (typeof value !== 'string' || !IDENTIFIER_RE.test(value)) {
    throw new TypeError(name + ' must be a simple SQL identifier');
  }
  return value;
}

function orderedRows(rows) {
  return rows.slice().sort((left, right) => Number(left.Seq_in_index) - Number(right.Seq_in_index));
}

function isExactUniqueIndex(rows, columns) {
  if (!Array.isArray(rows) || rows.length !== columns.length) return false;
  const ordered = orderedRows(rows);
  return ordered.every((row, index) =>
    Number(row.Non_unique) === 0 &&
    Number(row.Seq_in_index) === index + 1 &&
    row.Column_name === columns[index] &&
    (row.Sub_part === null || row.Sub_part === undefined)
  );
}

function schemaError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function ensureFinanceInnoDBTable({ allAsync, tableName }) {
  if (typeof allAsync !== 'function') throw new TypeError('allAsync is required');
  assertIdentifier(tableName, 'tableName');
  const rows = await allAsync(
    'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [tableName]
  );
  if (!Array.isArray(rows)) throw new TypeError('table engine lookup must return an array');
  if (!rows.length) {
    throw schemaError('FINANCE_SCHEMA_TABLE_MISSING', 'finance table ' + tableName + ' does not exist');
  }
  const engine = String(rows[0].ENGINE ?? rows[0].Engine ?? '').toUpperCase();
  if (engine !== 'INNODB') {
    throw schemaError(
      'FINANCE_SCHEMA_NON_TRANSACTIONAL_ENGINE',
      'finance table ' + tableName + ' must use InnoDB for transactional review safety'
    );
  }
  return { tableName, engine: 'InnoDB' };
}

async function ensureFinanceUniqueIndex({
  runAsync,
  allAsync,
  tableName,
  indexName,
  columns,
  duplicateMessage
}) {
  if (typeof runAsync !== 'function' || typeof allAsync !== 'function') {
    throw new TypeError('runAsync and allAsync are required');
  }
  assertIdentifier(tableName, 'tableName');
  assertIdentifier(indexName, 'indexName');
  if (!Array.isArray(columns) || columns.length < 1 || columns.length > 8) {
    throw new TypeError('columns must contain between 1 and 8 identifiers');
  }
  const safeColumns = columns.map((column, index) => assertIdentifier(column, 'columns[' + index + ']'));
  if (new Set(safeColumns).size !== safeColumns.length) {
    throw new TypeError('columns must not contain duplicate identifiers');
  }

  await ensureFinanceInnoDBTable({ allAsync, tableName });

  const columnRows = await allAsync('SHOW COLUMNS FROM ' + tableName);
  if (!Array.isArray(columnRows)) throw new TypeError('SHOW COLUMNS must return an array');
  const columnsByName = new Map(columnRows.map(column => [column.Field, column]));
  for (const columnName of safeColumns) {
    const column = columnsByName.get(columnName);
    if (!column) {
      throw schemaError(
        'FINANCE_SCHEMA_KEY_COLUMN_MISSING',
        'finance schema key column ' + columnName + ' is missing from ' + tableName
      );
    }
    if (String(column.Null || '').toUpperCase() !== 'NO') {
      throw schemaError(
        'FINANCE_SCHEMA_NULLABLE_KEY_COLUMN',
        'finance schema key column ' + columnName + ' on ' + tableName + ' must be NOT NULL'
      );
    }
  }

  const readIndexes = async () => {
    const rows = await allAsync('SHOW INDEX FROM ' + tableName);
    if (!Array.isArray(rows)) throw new TypeError('SHOW INDEX must return an array');
    return rows;
  };
  const indexes = await readIndexes();
  const named = indexes.filter(row => row.Key_name === indexName);
  if (named.length) {
    if (!isExactUniqueIndex(named, safeColumns)) {
      throw schemaError(
        'FINANCE_SCHEMA_INDEX_DRIFT',
        'finance schema index ' + indexName + ' on ' + tableName + ' has an unexpected definition'
      );
    }
    return { created: false, indexName };
  }

  const groups = new Map();
  for (const row of indexes) {
    const name = String(row.Key_name || '');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  for (const [name, rows] of groups) {
    if (isExactUniqueIndex(rows, safeColumns)) return { created: false, indexName: name };
  }

  const columnSql = safeColumns.join(', ');
  const duplicateRows = await allAsync(
    'SELECT ' + columnSql + ', COUNT(*) AS duplicate_count FROM ' + tableName +
    ' GROUP BY ' + columnSql + ' HAVING COUNT(*) > 1 LIMIT 1'
  );
  if (!Array.isArray(duplicateRows)) throw new TypeError('duplicate scan must return an array');
  if (duplicateRows.length) {
    throw schemaError(
      'FINANCE_SCHEMA_DUPLICATE_DATA',
      duplicateMessage || ('duplicate legacy rows prevent unique index creation on ' + tableName)
    );
  }

  try {
    await runAsync('CREATE UNIQUE INDEX ' + indexName + ' ON ' + tableName + ' (' + columnSql + ')');
  } catch (error) {
    // Several application instances may perform startup migrations concurrently.
    // Accept only a winner whose actual index definition is exactly the one required.
    if (error?.code !== 'ER_DUP_KEYNAME' && Number(error?.errno) !== 1061) throw error;
    const afterRace = await readIndexes();
    const raced = afterRace.filter(row => row.Key_name === indexName);
    if (isExactUniqueIndex(raced, safeColumns)) return { created: false, indexName };
    if (raced.length) {
      throw schemaError(
        'FINANCE_SCHEMA_INDEX_DRIFT',
        'finance schema index ' + indexName + ' on ' + tableName + ' has an unexpected definition'
      );
    }
    throw error;
  }

  return { created: true, indexName };
}

module.exports = { ensureFinanceUniqueIndex, isExactUniqueIndex, ensureFinanceInnoDBTable };
