import express from 'express';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMAS = {
  'billing.duckdb': 'billing',
  'calibration_status.duckdb': 'calibration_status',
  'consumers.duckdb': 'consumers',
  'customer_impact.duckdb': 'customer_impact',
  'demand_forecast.duckdb': 'demand_forecast',
  'evc.duckdb': 'evc',
  'executive_summary.duckdb': 'executive_summary',
  'field_operations.duckdb': 'field_operations',
  'gis.duckdb': 'gis',
  'leak.duckdb': 'leak',
  'meters-signal.duckdb': 'meters_signal',
  'mfs.duckdb': 'mfs',
  'revenue_billing.duckdb': 'revenue_billing',
  'sensor_data.duckdb': 'sensor_data',
  'tampering_events.duckdb': 'tampering_events',
  'ufg.duckdb': 'ufg',
};

pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(1114, (value) => value);
pg.types.setTypeParser(1184, (value) => value);
pg.types.setTypeParser(20, (value) => {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : value;
});
pg.types.setTypeParser(1700, (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
});

function loadEnv() {
  const file = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] == null) process.env[key] = value;
  }
}

let pool;
function getPool() {
  if (pool) return pool;
  loadEnv();
  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
  if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    const error = new Error('Postgres is not configured');
    error.status = 500;
    throw error;
  }
  pool = new pg.Pool({
    host: PGHOST,
    port: Number(PGPORT || 5432),
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    max: 8,
    statement_timeout: 180000,
  });
  pool.on('error', (error) => console.error(error));
  return pool;
}

let gate = Promise.resolve();
const metaCache = new Map();
let databaseList = null;

function queued(work) {
  const run = gate.then(work);
  gate = run.then(() => {}, () => {});
  return run;
}

function toPg(sql) {
  return sql.replaceAll('::DOUBLE', '::float8').replaceAll('INTERVAL 1 DAY', "INTERVAL '1 day'");
}

async function pgQuery(sql, params = []) {
  const result = await getPool().query(toPg(sql), params);
  return result.rows;
}

async function readDatabaseList() {
  const rows = await pgQuery(`SELECT nspname FROM pg_namespace`);
  const have = new Set(rows.map((row) => row.nspname));
  return Object.entries(SCHEMAS)
    .filter(([, schema]) => have.has(schema))
    .map(([name]) => ({ name, bytes: 0, mtimeMs: 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function listDatabases() {
  if (!databaseList) databaseList = await readDatabaseList();
  return databaseList;
}

async function databaseOrThrow(name) {
  const base = path.basename(String(name || ''));
  if (!base || base !== String(name) || !SCHEMAS[base]) {
    const error = new Error('Unknown database');
    error.status = 404;
    throw error;
  }
  let files = await listDatabases();
  if (!files.some((file) => file.name === base)) {
    databaseList = null;
    files = await listDatabases();
  }
  const file = files.find((item) => item.name === base);
  if (!file) {
    const error = new Error('Unknown database');
    error.status = 404;
    throw error;
  }
  return file;
}

async function openDatabase(name) {
  const file = await databaseOrThrow(name);
  const cached = metaCache.get(file.name);
  if (cached) return cached;
  const loaded = await loadMeta(SCHEMAS[file.name]);
  metaCache.set(file.name, loaded);
  return loaded;
}

async function query(database, sql, params = []) {
  return queued(async () => {
    await openDatabase(database);
    const schema = SCHEMAS[database];
    const client = await getPool().connect();
    const onError = (error) => console.error(error);
    client.on('error', onError);
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${quoteIdent(schema)}`);
      const result = await client.query(toPg(sql), params);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* connection already failed */ }
      throw error;
    } finally {
      client.removeListener('error', onError);
      client.release();
    }
  });
}

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function kindOf(type) {
  const t = String(type).toUpperCase();
  if (t.includes('TIMESTAMP') || t === 'DATE' || t.startsWith('TIME')) return 'time';
  if (
    t.includes('INT') ||
    t.includes('DOUBLE') ||
    t.includes('FLOAT') ||
    t.includes('REAL') ||
    t.includes('DECIMAL') ||
    t.includes('NUMERIC')
  ) {
    return 'number';
  }
  return 'text';
}

function num(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function loadMeta(schema) {
  const tables = new Map();
  const found = await pgQuery(
    `
    SELECT c.relname AS table_name, c.reltuples::bigint AS estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind = 'r'
    ORDER BY c.relname
    `,
    [schema],
  );
  const columns = await pgQuery(
    `
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = $1
    ORDER BY table_name, ordinal_position
    `,
    [schema],
  );
  const byTable = new Map();
  for (const column of columns) {
    const list = byTable.get(column.table_name) || [];
    list.push(column);
    byTable.set(column.table_name, list);
  }

  for (const { table_name: name, estimate } of found) {
    const count = num(estimate);
    const enriched = (byTable.get(name) || []).map((column) => ({
      name: column.column_name,
      type: column.data_type,
      kind: kindOf(column.data_type),
      min: null,
      max: null,
      approxUnique: null,
      avg: null,
      q25: null,
      q50: null,
      q75: null,
      nullPct: null,
      count,
      options: null,
    }));
    tables.set(name, {
      name,
      count: count ?? 0,
      columns: enriched,
      columnSet: new Set(enriched.map((column) => column.name)),
    });
  }

  const column = (table, col) => tables.get(table)?.columnSet.has(col);
  const deviceLookup = Boolean(column('devices', 'New Msn')
    && column('devices', 'Retrofit id')
    && column('comms', 'MSN')
    && column('comms', 'Retrofit Id')
    && column('comms', 'RTC')
    && column('daily', 'MSN')
    && column('gsm', 'MSN')
    && column('gsm', 'RSRP')
    && column('roster', 'device_id'));

  return { tables, deviceLookup };
}

function tableOrThrow(database, name) {
  const table = metaCache.get(database)?.tables?.get(name);
  if (!table) {
    const error = new Error('Unknown table');
    error.status = 404;
    throw error;
  }
  return table;
}

function normalizeTimeInput(value) {
  return String(value).trim().replace('T', ' ');
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function compileFilters(table, filters) {
  if (!Array.isArray(filters)) return { where: 'TRUE', params: [] };
  const parts = [];
  const params = [];
  const columns = new Map(table.columns.map((column) => [column.name, column]));

  for (const filter of filters) {
    if (!filter || typeof filter !== 'object') continue;
    const column = columns.get(filter.column);
    if (!column) {
      const error = new Error(`Unknown column: ${filter.column}`);
      error.status = 400;
      throw error;
    }
    const ident = quoteIdent(column.name);
    const op = filter.op;

    if (op === 'is_null') {
      parts.push(`${ident} IS NULL`);
      continue;
    }
    if (op === 'not_null') {
      parts.push(`${ident} IS NOT NULL`);
      continue;
    }
    if (op === 'in') {
      const values = Array.isArray(filter.values) ? filter.values.filter((v) => v != null && v !== '') : [];
      const clauses = [];
      if (values.length) {
        const placeholders = values.map((value) => {
          params.push(String(value));
          return `$${params.length}`;
        });
        clauses.push(`CAST(${ident} AS VARCHAR) IN (${placeholders.join(', ')})`);
      }
      if (filter.includeNull) clauses.push(`${ident} IS NULL`);
      if (clauses.length) parts.push(`(${clauses.join(' OR ')})`);
      continue;
    }
    if (op === 'eq' || op === 'contains') {
      const value = String(filter.value ?? '').trim();
      if (!value) continue;
      if (op === 'eq') {
        params.push(value);
        parts.push(`CAST(${ident} AS VARCHAR) = $${params.length}`);
      } else {
        params.push(`%${escapeLike(value)}%`);
        parts.push(`CAST(${ident} AS VARCHAR) ILIKE $${params.length} ESCAPE '\\'`);
      }
      continue;
    }
    if (op === 'between' || op === 'gte' || op === 'lte') {
      const from = filter.from ?? (op === 'gte' ? filter.value : '');
      const to = filter.to ?? (op === 'lte' ? filter.value : '');
      const hasFrom = from != null && String(from).trim() !== '';
      const hasTo = to != null && String(to).trim() !== '';
      if (!hasFrom && !hasTo) continue;

      if (column.kind === 'number') {
        if (hasFrom) {
          const parsed = Number(from);
          if (!Number.isFinite(parsed)) {
            const error = new Error(`Lower bound of "${column.name}" is not a number`);
            error.status = 400;
            throw error;
          }
          params.push(parsed);
          parts.push(`${ident} >= $${params.length}`);
        }
        if (hasTo) {
          const parsed = Number(to);
          if (!Number.isFinite(parsed)) {
            const error = new Error(`Upper bound of "${column.name}" is not a number`);
            error.status = 400;
            throw error;
          }
          params.push(parsed);
          parts.push(`${ident} <= $${params.length}`);
        }
        continue;
      }

      if (column.kind === 'time') {
        if (hasFrom) {
          params.push(normalizeTimeInput(from));
          parts.push(`${ident} >= $${params.length}::timestamp`);
        }
        if (hasTo) {
          const raw = String(to).trim();
          params.push(normalizeTimeInput(raw));
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            parts.push(`${ident} < $${params.length}::date + INTERVAL '1 day'`);
          } else {
            parts.push(`${ident} <= $${params.length}::timestamp`);
          }
        }
        continue;
      }

      if (hasFrom) {
        params.push(String(from));
        parts.push(`CAST(${ident} AS VARCHAR) >= $${params.length}`);
      }
      if (hasTo) {
        params.push(String(to));
        parts.push(`CAST(${ident} AS VARCHAR) <= $${params.length}`);
      }
    }
  }

  return { where: parts.length ? parts.join(' AND ') : 'TRUE', params };
}

function compileQuery(database, body, { limitCap, withPaging }) {
  const table = tableOrThrow(database, body?.table);
  const { where, params } = compileFilters(table, body?.filters);
  let order = '';
  if (body?.sort?.column) {
    if (!table.columnSet.has(body.sort.column)) {
      const error = new Error('Unknown sort column');
      error.status = 400;
      throw error;
    }
    const dir = String(body.sort.dir || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    order = ` ORDER BY ${quoteIdent(body.sort.column)} ${dir} NULLS LAST`;
  }
  const limit = Math.max(1, Math.min(limitCap, Math.trunc(Number(body?.limit) || 100)));
  const offset = Math.max(0, Math.min(1_000_000, Math.trunc(Number(body?.offset) || 0)));
  const paging = withPaging ? ` LIMIT ${limit} OFFSET ${offset}` : ` LIMIT ${limit}`;
  const sql = `SELECT * FROM ${quoteIdent(table.name)} WHERE ${where}${order}${paging}`;
  const countSql = `SELECT count(*)::DOUBLE AS n FROM ${quoteIdent(table.name)} WHERE ${where}`;
  return { table, sql, countSql, params, limit, offset };
}

function csvEscape(value) {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function databaseFrom(bodyOrQuery) {
  const name = bodyOrQuery?.database;
  if (!name) {
    const error = new Error('database is required');
    error.status = 400;
    throw error;
  }
  return String(name);
}

const app = express();
const publicDir = path.join(__dirname, 'public');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/explorer', express.static(publicDir));
app.get('/explorer', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/api/databases', async (_req, res, next) => {
  try {
    const databases = await listDatabases();
    res.json({ databases });
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta', async (req, res, next) => {
  try {
    const database = databaseFrom(req.query);
    const loaded = await queued(() => openDatabase(database));
    res.json({
      file: database,
      readOnly: true,
      deviceLookup: loaded.deviceLookup,
      tables: [...loaded.tables.values()].map(({ columnSet, ...table }) => table),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/query', async (req, res, next) => {
  try {
    const started = Date.now();
    const database = databaseFrom(req.body);
    await queued(() => openDatabase(database));
    const compiled = compileQuery(database, req.body, { limitCap: 500, withPaging: true });
    const [countRow] = await query(database, compiled.countSql, compiled.params);
    const rows = await query(database, compiled.sql, compiled.params);
    res.json({
      table: compiled.table.name,
      total: num(countRow?.n) ?? 0,
      limit: compiled.limit,
      offset: compiled.offset,
      ms: Date.now() - started,
      columns: compiled.table.columns.map(({ name, type, kind }) => ({ name, type, kind })),
      rows,
      sql: compiled.sql,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/export', async (req, res, next) => {
  try {
    const database = databaseFrom(req.body);
    await queued(() => openDatabase(database));
    const compiled = compileQuery(database, req.body, { limitCap: 20000, withPaging: true });
    const rows = await query(database, compiled.sql, compiled.params);
    const headers = compiled.table.columns.map((column) => column.name);
    const lines = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
    ];
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${compiled.table.name}.csv"`);
    res.send(`\uFEFF${lines.join('\n')}`);
  } catch (error) {
    next(error);
  }
});

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function dayOrThrow(value, label) {
  const text = String(value || '').trim();
  if (!DAY.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    const error = new Error(`${label} must be YYYY-MM-DD`);
    error.status = 400;
    throw error;
  }
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    const error = new Error(`${label} must be YYYY-MM-DD`);
    error.status = 400;
    throw error;
  }
  return text;
}

app.get('/api/ufg', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const cluster = String(req.query.cluster || '').trim();
    if (cluster && !/^[A-Za-z0-9_]+$/.test(cluster)) {
      const error = new Error('cluster must be a system id such as c_41');
      error.status = 400;
      throw error;
    }
    const rows = await query(
      'ufg.duckdb',
      `SELECT "Date"::VARCHAR AS "Date",
              "Cluster Number",
              "Region",
              "Sale",
              "Purchase",
              "UFG%"
       FROM dashboard
       WHERE "Date" BETWEEN $1::DATE AND $2::DATE
         AND ($3 = '' OR "Cluster Number" = $3)
       ORDER BY "Date", "Cluster Number"`,
      [from, to, cluster],
    );
    res.json({ from, to, cluster: cluster || null, count: rows.length, rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/device', async (req, res, next) => {
  try {
    const database = databaseFrom(req.query);
    const loaded = await queued(() => openDatabase(database));
    if (!loaded.deviceLookup) {
      const error = new Error('This database has no meter lookup');
      error.status = 404;
      throw error;
    }
    const q = String(req.query.q || '').trim();
    const msn = String(req.query.msn || '').trim();
    const retrofit = String(req.query.retrofit || '').trim();
    if (q.length < 3 && !msn && !retrofit) {
      const error = new Error('Enter at least 3 characters: MSN, retrofit, account, ICCID, or address');
      error.status = 400;
      throw error;
    }

    let devices = [];
    let readings = [];
    if (q) {
      const like = `%${escapeLike(q)}%`;
      devices = await query(database, 
        `SELECT *
         FROM devices
         WHERE "New Msn" ILIKE $1 ESCAPE '\\'
            OR "Retrofit id" ILIKE $1 ESCAPE '\\'
            OR "AccountId" ILIKE $1 ESCAPE '\\'
            OR "ICCID" ILIKE $1 ESCAPE '\\'
            OR "Address description for easier identification" ILIKE $1 ESCAPE '\\'
         ORDER BY ("New Msn" = $2) DESC, ("Retrofit id" = $2) DESC, "New Msn"
         LIMIT 25`,
        [like, q],
      );
      readings = await query(database, 
        `SELECT "MSN" AS msn, "Retrofit Id" AS retrofit, count(*)::DOUBLE AS n, max("RTC")::VARCHAR AS last_rtc
         FROM comms
         WHERE "MSN" ILIKE $1 ESCAPE '\\' OR "Retrofit Id" ILIKE $1 ESCAPE '\\'
         GROUP BY 1, 2
         ORDER BY ("MSN" = $2) DESC, last_rtc DESC
         LIMIT 15`,
        [like, q],
      );
    }

    const selectedMsn = msn || devices[0]?.['New Msn'] || readings[0]?.msn || '';
    const selectedRetrofit = retrofit || devices[0]?.['Retrofit id'] || readings[0]?.retrofit || '';
    let selected = null;
    if (selectedMsn || selectedRetrofit) {
      const device =
        devices.find((row) => row['New Msn'] === selectedMsn || row['Retrofit id'] === selectedRetrofit) ||
        (
          await query(database, 
            `SELECT * FROM devices
             WHERE ($1 <> '' AND "New Msn" = $1) OR ($2 <> '' AND "Retrofit id" = $2)
             LIMIT 1`,
            [selectedMsn, selectedRetrofit],
          )
        )[0] ||
        null;

      const keyParams = [selectedMsn, selectedRetrofit];
      const keyWhere = `( $1 <> '' AND "MSN" = $1 ) OR ( $2 <> '' AND "Retrofit Id" = $2 )`;
      const [commsStats] = await query(database, 
        `SELECT count(*)::DOUBLE AS n,
                min("RTC")::VARCHAR AS first,
                max("RTC")::VARCHAR AS last,
                min("Total Vb (M3)") AS min_vb,
                max("Total Vb (M3)") AS max_vb
         FROM comms WHERE ${keyWhere}`,
        keyParams,
      );
      const [dailyStats] = await query(database, 
        `SELECT count(*)::DOUBLE AS n, min("RTC")::VARCHAR AS first, max("RTC")::VARCHAR AS last
         FROM daily WHERE ${keyWhere}`,
        keyParams,
      );
      const [gsmStats] = await query(database, 
        `SELECT count(*)::DOUBLE AS n,
                min("RTC")::VARCHAR AS first,
                max("RTC")::VARCHAR AS last,
                min("RSRP") AS min_rsrp,
                max("RSRP") AS max_rsrp,
                round(avg("RSRP")::numeric, 1) AS avg_rsrp,
                round(avg("SNR")::numeric, 1) AS avg_snr
         FROM gsm WHERE ${keyWhere}`,
        keyParams,
      );
      const comms = await query(database, 
        `SELECT * FROM comms WHERE ${keyWhere} ORDER BY "RTC" DESC LIMIT 80`,
        keyParams,
      );
      const daily = await query(database, 
        `SELECT * FROM daily WHERE ${keyWhere} ORDER BY "RTC" DESC LIMIT 80`,
        keyParams,
      );
      const gsm = await query(database, 
        `SELECT * FROM gsm WHERE ${keyWhere} ORDER BY "RTC" DESC LIMIT 80`,
        keyParams,
      );
      const roster = await query(database, 
        `SELECT * FROM roster
         WHERE ($1 <> '' AND device_id = $1) OR ($2 <> '' AND device_id = $2)
         ORDER BY report_date DESC
         LIMIT 60`,
        keyParams,
      );
      selected = {
        msn: selectedMsn || null,
        retrofit: selectedRetrofit || null,
        device,
        stats: {
          comms: commsStats,
          daily: dailyStats,
          gsm: gsmStats,
          roster: roster.length,
        },
        comms,
        daily,
        gsm,
        roster,
      };
    }

    res.json({ devices, readings, selected });
  } catch (error) {
    next(error);
  }
});

function mediumPredicate(mode, sites, start) {
  const site = `"Site Name / QPS ID/ Cluster ID / Customer ID"`;
  const numbered = `${site} ~ '^Cluster [0-9]+$'`;
  const bakuSite = `${site} = 'Hacı Seyfəlli xətti (Nardaran QPS)'`;
  if (mode === 'all') return { sql: 'TRUE', params: [] };
  if (mode === 'sumgayit') return { sql: numbered, params: [] };
  if (mode === 'baku') return { sql: bakuSite, params: [] };
  if (mode !== 'sites' || !sites.length) return { sql: 'FALSE', params: [] };
  const placeholders = sites.map((_, index) => `$${start + index}`);
  return { sql: `${site} IN (${placeholders.join(', ')})`, params: sites };
}

app.get('/api/pressure', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const lowRegion = String(req.query.lowRegion || 'all');
    const medium = String(req.query.medium || 'all');
    if (!['all', 'Sumgait', 'Baku', 'none'].includes(lowRegion) || !['all', 'sumgayit', 'baku', 'sites', 'none'].includes(medium)) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const cluster = String(req.query.cluster || '');
    const rawSites = Array.isArray(req.query.site) ? req.query.site : req.query.site ? [req.query.site] : [];
    const sites = rawSites.map((site) => String(site));
    if (!/^[A-Za-z0-9_]{0,80}$/.test(cluster) || sites.length > 80 || sites.some((site) => site.length > 200)) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }

    let lowSensors = 0;
    let lowViolations = 0;
    if (lowRegion !== 'none') {
      const region = lowRegion === 'all' ? '' : lowRegion;
      const params = [from, to, region, cluster];
      const [sensors] = await query(
        'sensor_data.duckdb',
        `SELECT count(*)::DOUBLE AS n
         FROM sensor_master
         WHERE sensor_type = 'Pressure'
           AND $1::DATE <= $2::DATE
           AND ($3 = '' OR region = $3)
           AND ($4 = '' OR cluster = $4)`,
        params,
      );
      const [violations] = await query(
        'sensor_data.duckdb',
        `SELECT count(DISTINCT r.device_id)::DOUBLE AS n
         FROM sensor_readings r
         JOIN sensor_master m ON m.device_id = r.device_id
         WHERE m.sensor_type = 'Pressure'
           AND r.reading_type = 'Pressure'
           AND ($3 = '' OR m.region = $3)
           AND ($4 = '' OR m.cluster = $4)
           AND r.reading_time >= $1::TIMESTAMP
           AND r.reading_time < $2::DATE + INTERVAL 1 DAY
           AND (r.reading_value < 18 OR r.reading_value > 50)`,
        params,
      );
      lowSensors = num(sensors?.n) ?? 0;
      lowViolations = num(violations?.n) ?? 0;
    }

    let mediumSensors = 0;
    let mediumViolations = 0;
    if (medium !== 'none') {
      const pred = mediumPredicate(medium, sites, 3);
      const params = [from, to, ...pred.params];
      const [sensors] = await query(
        'evc.duckdb',
        `SELECT count(*)::DOUBLE AS n
         FROM "Master Sheet"
         WHERE $1::DATE <= $2::DATE
           AND (${pred.sql})`,
        params,
      );
      const [violations] = await query(
        'evc.duckdb',
        `SELECT count(DISTINCT p."MSN")::DOUBLE AS n
         FROM "Monthly Pressure" p
         JOIN "Master Sheet" m ON m."EVC Serial Number" = p."MSN"
         WHERE p."P1Value (bar)" < 1.1
           AND p."RTC" >= $1::TIMESTAMP
           AND p."RTC" < $2::DATE + INTERVAL 1 DAY
           AND (${pred.sql})`,
        params,
      );
      mediumSensors = num(sensors?.n) ?? 0;
      mediumViolations = num(violations?.n) ?? 0;
    }

    res.json({ lowSensors, mediumSensors, lowViolations, mediumViolations });
  } catch (error) {
    next(error);
  }
});

let nonResidentialIds = null;

async function loadNonResidentialIds() {
  if (nonResidentialIds) return nonResidentialIds;
  const rows = await query(
    'consumers.duckdb',
    `SELECT DISTINCT "SUBID_" AS id FROM "QEYRİ-ƏHALİ" WHERE "SUBID_" IS NOT NULL AND "SUBID_" <> ''`,
  );
  nonResidentialIds = rows.map((row) => String(row.id)).filter((id) => /^[0-9A-Za-z]+$/.test(id));
  return nonResidentialIds;
}

function inclusiveDays(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86400000) + 1;
}

app.get('/api/quality', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const deviceRegion = String(req.query.deviceRegion || '');
    const clusterNo = String(req.query.clusterNo || '');
    const balance = String(req.query.balance || 'all');
    if (
      !['', 'Sumgayit/Sumgayit', 'Baku', 'Agsu', 'none'].includes(deviceRegion)
      || !/^[A-Za-z0-9_]{0,80}$/.test(clusterNo)
      || !['all', 'sumgayit', 'baku', 'sites', 'none'].includes(balance)
    ) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const rawSites = Array.isArray(req.query.site) ? req.query.site : req.query.site ? [req.query.site] : [];
    const sites = rawSites.map((site) => String(site));
    if (sites.length > 80 || sites.some((site) => site.length > 200)) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }

    const days = inclusiveDays(from, to);
    let total = 0;
    let nonResidential = 0;
    let receivedOverall = 0;
    let receivedResidential = 0;
    let receivedNonResidential = 0;
    if (deviceRegion !== 'none') {
      const ids = await loadNonResidentialIds();
      const nonres = ids.length ? `"AccountId" IN (${ids.map((id) => `'${id}'`).join(', ')})` : 'FALSE';
      const [row] = await query(
        'meters-signal.duckdb',
        `WITH hits AS (
           SELECT "Retrofit Id" AS retrofit, CAST("RTC" AS DATE) AS dt
           FROM comms
           WHERE "RTC" >= $1::TIMESTAMP
             AND "RTC" < $2::DATE + INTERVAL 1 DAY
             AND "Retrofit Id" IS NOT NULL AND "Retrofit Id" <> ''
           UNION
           SELECT "Retrofit Id", CAST("RTC" AS DATE)
           FROM daily
           WHERE "RTC" >= $1::TIMESTAMP
             AND "RTC" < $2::DATE + INTERVAL 1 DAY
             AND "Retrofit Id" IS NOT NULL AND "Retrofit Id" <> ''
         ),
         dev AS (
           SELECT "Retrofit id" AS retrofit, ${nonres} AS nonres
           FROM devices
           WHERE ($3 = '' OR "Region" = $3)
             AND ($4 = '' OR "Cluster no" = $4)
         )
         SELECT
           (SELECT count(*)::DOUBLE FROM dev) AS total,
           (SELECT count(*)::DOUBLE FROM dev WHERE nonres) AS nonres,
           (SELECT count(*)::DOUBLE FROM hits h WHERE h.retrofit IN (SELECT retrofit FROM dev)) AS overall_hits,
           (SELECT count(*)::DOUBLE FROM hits h WHERE h.retrofit IN (SELECT retrofit FROM dev WHERE nonres)) AS nonres_hits,
           (SELECT count(*)::DOUBLE FROM hits h WHERE h.retrofit IN (SELECT retrofit FROM dev WHERE NOT nonres)) AS res_hits`,
        [from, to, deviceRegion, clusterNo],
      );
      total = num(row?.total) ?? 0;
      nonResidential = num(row?.nonres) ?? 0;
      receivedOverall = num(row?.overall_hits) ?? 0;
      receivedNonResidential = num(row?.nonres_hits) ?? 0;
      receivedResidential = num(row?.res_hits) ?? 0;
    }

    let balanceMeters = 0;
    let receivedBalance = 0;
    if (balance !== 'none') {
      const pred = mediumPredicate(balance, sites, 3);
      const [row] = await query(
        'evc.duckdb',
        `WITH meters AS (
           SELECT "EVC Serial Number" AS msn
           FROM "Master Sheet"
           WHERE "EVC type" = 'Non-Commercial'
             AND (${pred.sql})
         )
         SELECT
           (SELECT count(*)::DOUBLE FROM meters) AS n,
           (SELECT count(*)::DOUBLE FROM (
              SELECT DISTINCT p."MSN", CAST(p."RTC" AS DATE) AS dt
              FROM "Monthly Pressure" p
              WHERE p."MSN" IN (SELECT msn FROM meters)
                AND p."RTC" >= $1::TIMESTAMP
                AND p."RTC" < $2::DATE + INTERVAL 1 DAY
           )) AS hits`,
        [from, to, ...pred.params],
      );
      balanceMeters = num(row?.n) ?? 0;
      receivedBalance = num(row?.hits) ?? 0;
    }

    res.json({
      days,
      total,
      residential: total - nonResidential,
      nonResidential,
      balance: balanceMeters,
      received: {
        overall: receivedOverall,
        residential: receivedResidential,
        nonResidential: receivedNonResidential,
        balance: receivedBalance,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/demand', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const balance = String(req.query.balance || 'all');
    if (!['all', 'sumgayit', 'baku', 'sites', 'none'].includes(balance)) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const rawSites = Array.isArray(req.query.site) ? req.query.site : req.query.site ? [req.query.site] : [];
    const sites = rawSites.map((site) => String(site));
    if (sites.length > 80 || sites.some((site) => site.length > 200)) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const forecastCluster = String(req.query.forecast || '');
    if (forecastCluster && forecastCluster !== 'c_41' && forecastCluster !== 'c_42') {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    let points = [];
    if (balance !== 'none') {
      const pred = mediumPredicate(balance, sites, 3);
      const rows = await query(
        'evc.duckdb',
        `WITH meters AS (
           SELECT "EVC Serial Number" AS msn
           FROM "Master Sheet"
           WHERE "EVC type" = 'Non-Commercial'
             AND (${pred.sql})
         ),
         daily AS (
           SELECT CAST(p."EntryTimestamp" AS DATE) AS dt,
                  p."MSN" AS msn,
                  max(p."DvbsumMcValue") AS value
           FROM "Monthly Purchase" p
           WHERE p."MSN" IN (SELECT msn FROM meters)
             AND p."EntryTimestamp" >= $1::TIMESTAMP
             AND p."EntryTimestamp" < $2::DATE + INTERVAL 1 DAY
           GROUP BY 1, 2
         )
         SELECT CAST(dt AS VARCHAR) AS date, sum(value)::DOUBLE AS value
         FROM daily
         GROUP BY dt
         ORDER BY dt`,
        [from, to, ...pred.params],
      );
      points = rows.map((row) => ({
        date: String(row.date).slice(0, 10),
        value: num(row.value) ?? 0,
      }));
    }
    let forecast = null;
    if (forecastCluster) {
      const rows = await query(
        'demand_forecast.duckdb',
        `SELECT CAST(CAST("DateTime" AS DATE) AS VARCHAR) AS date,
                sum("Forecast demand")::DOUBLE AS predicted,
                sum("Demand used in simulation")::DOUBLE AS simulated,
                count("Demand used in simulation")::DOUBLE AS simulated_hours
         FROM forecast
         WHERE "Cluster" = $3
           AND "DateTime" >= $1::TIMESTAMP
           AND "DateTime" < $2::DATE + INTERVAL 1 DAY
         GROUP BY 1
         ORDER BY 1`,
        [from, to, forecastCluster],
      );
      const simulated = [];
      const predicted = [];
      for (const row of rows) {
        const date = String(row.date).slice(0, 10);
        const past = num(row.simulated);
        const future = num(row.predicted);
        if (past != null && (num(row.simulated_hours) ?? 0) >= 24) simulated.push({ date, value: past });
        if (future != null) predicted.push({ date, value: future });
      }
      forecast = { simulated, predicted };
    }
    res.json({
      total: points.reduce((sum, point) => sum + point.value, 0),
      points,
      forecast,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/meters', async (req, res, next) => {
  try {
    const region = String(req.query.region || '');
    const raw = String(req.query.clusters || '');
    const clusters = raw ? raw.split(',') : [];
    if (
      (region && !['Sumgayit/Sumgayit', 'Baku', 'Agsu'].includes(region))
      || clusters.length > 400
      || clusters.some((cluster) => !/^\d+$/.test(cluster))
    ) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    let where = '$1 = $1';
    let params = ['1'];
    if (region) {
      where = '"Region" = $1';
      params = [region];
    } else if (clusters.length) {
      where = `"Cluster no" IN (${clusters.map((_, index) => `$${index + 1}`).join(', ')})`;
      params = clusters;
    }
    const [row] = await query(
      'meters-signal.duckdb',
      `SELECT
         count(*)::DOUBLE AS total,
         count(*) FILTER (WHERE "New Msn" = "Retrofit id")::DOUBLE AS smart
       FROM devices
       WHERE ${where}`,
      params,
    );
    const total = num(row?.total) ?? 0;
    const smart = num(row?.smart) ?? 0;
    res.json({ smart, retrofit: total - smart });
  } catch (error) {
    next(error);
  }
});

app.get('/api/gis', async (req, res, next) => {
  try {
    const raw = Array.isArray(req.query.cluster) ? req.query.cluster : req.query.cluster ? [req.query.cluster] : [];
    const clusters = raw.map((cluster) => String(cluster));
    if (clusters.length > 80 || clusters.some((cluster) => !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const filter = clusters.length
      ? `WHERE "Cluster" IN (${clusters.map((_, index) => `$${index + 1}`).join(', ')})`
      : '';
    const rows = await query(
      'gis.duckdb',
      `SELECT
         "Cluster",
         "Distribution Pipe Length",
         "Service Pipe Length",
         "Meters",
         "Stations",
         "Valves"
       FROM gis
       ${filter}
       ORDER BY "Cluster"`,
      clusters,
    );
    res.json({
      rows: rows.map((row) => ({
        Cluster: row.Cluster,
        'Distribution Pipe Length': num(row['Distribution Pipe Length']) ?? 0,
        'Service Pipe Length': num(row['Service Pipe Length']) ?? 0,
        Meters: num(row.Meters) ?? 0,
        Stations: num(row.Stations) ?? 0,
        Valves: num(row.Valves) ?? 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

const reconnectScopes = {
  baku: ['BRQİİ / BRQSD'],
  sumgayit: ['Sumqayıt RQİİ'],
  agsu: ['Ağsu RQİİ'],
  all: ['Ağsu RQİİ', 'Sumqayıt RQİİ', 'BRQİİ / BRQSD'],
};

app.get('/api/reconnect', async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = String(req.query.month || '');
    const names = reconnectScopes[String(req.query.scope || '')];
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !/^(0[1-9]|1[0-2])$/.test(month) || !names) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const placeholders = names.map((_, index) => `$${index + 3}`).join(', ');
    const [row] = await query(
      'field_operations.duckdb',
      `SELECT sum(rc_24h)::DOUBLE AS done, sum(rc_completed)::DOUBLE AS completed
       FROM operations
       WHERE level = 'rqii'
         AND year = $1
         AND month = $2
         AND rqii IN (${placeholders})`,
      [year, month, ...names],
    );
    const completed = num(row?.completed);
    const done = num(row?.done);
    res.json({ pct: completed != null && completed > 0 && done != null ? (done / completed) * 100 : null });
  } catch (error) {
    next(error);
  }
});

function impactSum(row, keys) {
  return keys.reduce((total, key) => total + (num(row?.[key]) ?? 0), 0);
}

async function scopeRow(database, table, select, year, month, level, name) {
  const [row] = await query(
    database,
    `SELECT ${select}
     FROM ${quoteIdent(table)}
     WHERE year = $1
       AND month = $2
       AND level = $3
       AND ($3 = 'republic' OR name = $4)
     LIMIT 1`,
    [year, month, level, name],
  );
  return row || null;
}

function calibrationBody(row) {
  if (!row) return null;
  return {
    compliance: num(row.total_compliance),
    overdue: num(row.total_overdue),
    pending: num(row.total_p90),
    assets: num(row.total_assets),
    p0_30: num(row.total_p0_30),
    p31_60: num(row.total_p31_60),
    p61_90: num(row.total_p61_90),
    residential: num(row.res_compliance),
    nonResidential: num(row.nres_compliance),
    balance: num(row.bal_compliance),
    sensors: num(row.sen_compliance),
  };
}

function operationsBody(row) {
  if (!row) return null;
  return {
    calls: num(row.acc_calls),
    firstVisit: num(row.first_visit_pct),
    leaks24: num(row.leak_repair_24h_pct),
    tamper: num(row.mr_tamper),
    pipeKm: num(row.pipe_km_done),
    leaksPerKm: num(row.leaks_per_km),
    pipeCoverage: num(row.pipe_coverage_pct),
    regulators: num(row.reg_done),
    regulatorCoverage: num(row.reg_coverage_pct),
    reconnection: num(row.rc_orders),
    within24: num(row.rc_24h_pct),
    completion: num(row.rc_completion_pct),
    disconnection: num(row.dc_visits),
    within7: num(row.dc_7d_pct),
    meterCut: num(row.dc_cut_pct),
    replacements: num(row.mr_acts),
    replacement24: num(row.mr_24h_pct),
  };
}

app.get('/api/impact', async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = String(req.query.month || '');
    const level = String(req.query.level || '');
    const name = String(req.query.name || '');
    const monthOk = month === 'All' || /^(0[1-9]|1[0-2])$/.test(month);
    const levelOk = level === 'republic' || level === 'rqii' || level === 'region';
    const nameOk = level === 'republic' || (/^[\p{L}\p{N} ./'’-]+$/u.test(name) && name.length <= 80);
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !monthOk || !levelOk || !nameOk) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const [row] = await query(
      'customer_impact.duckdb',
      `SELECT service_level, affected, serious, fcr, cc_answered, queue,
              an_no, an_low, an_spike, repeat_calls, reopened,
              calls, open, closed, crm_sla_1,
              i_no_gas,
              i_leak_appliance, i_leak_flat, i_leak_pipe, i_leak_stairwell, i_leak_street, i_leak_valve,
              i_leak_meter, i_leak_meter_inlet,
              i_low_pressure, i_low_pressure_days, i_high_pressure, i_unstable_pressure,
              i_other, i_appliance_fault, i_broken_valve, i_co_poisoning, i_vehicle_damage, i_water_in_pipe, i_welding_needed
       FROM calls
       WHERE year = $1
         AND month = $2
         AND level = $3
         AND ($3 = 'republic' OR name = $4)
       LIMIT 1`,
      [year, month, level, name],
    );
    const heatRows = await query(
      'customer_impact.duckdb',
      `SELECT rqii, month, service_level
       FROM calls
       WHERE year = $1
         AND period = 'month'
         AND level = 'rqii'
         AND month <> 'All'`,
      [year],
    );
    let anomalySource = row;
    let anomaliesAsOf = null;
    if (month !== 'All' && `${year}-${month}` > '2026-08') {
      const [august] = await query(
        'customer_impact.duckdb',
        `SELECT an_no, an_low, an_spike
         FROM calls
         WHERE year = $1
           AND month = $2
           AND level = $3
           AND ($3 = 'republic' OR name = $4)
         LIMIT 1`,
        [2026, '08', level, name],
      );
      if (august) {
        anomalySource = august;
        anomaliesAsOf = '2026-08';
      }
    }
    const anomaliesLive = anomalySource && (month === 'All' || `${year}-${month}` <= '2026-08' || anomaliesAsOf);
    const calibrationSelect = `total_compliance, total_overdue, total_p90, total_assets,
              total_p0_30, total_p31_60, total_p61_90,
              res_compliance, nres_compliance, bal_compliance, sen_compliance`;
    let calibrationRow = await scopeRow('calibration_status.duckdb', 'calibration', calibrationSelect, year, month, level, name);
    let calibrationAsOf = null;
    if (!calibrationRow && month !== 'All' && `${year}-${month}` > '2026-08') {
      calibrationRow = await scopeRow('calibration_status.duckdb', 'calibration', calibrationSelect, 2026, '08', level, name);
      if (calibrationRow) calibrationAsOf = '2026-08';
    }
    const operationsRow = await scopeRow(
      'field_operations.duckdb',
      'operations',
      `acc_calls, first_visit_pct, leak_repair_24h_pct, mr_tamper,
       pipe_km_done, leaks_per_km, pipe_coverage_pct, reg_done, reg_coverage_pct,
       rc_orders, rc_24h_pct, rc_completion_pct, dc_visits, dc_7d_pct, dc_cut_pct,
       mr_acts, mr_24h_pct`,
      year,
      month,
      level,
      name,
    );
    res.json({
      serviceLevel: num(row?.service_level),
      affected: num(row?.affected),
      serious: num(row?.serious),
      fcr: num(row?.fcr),
      answered: num(row?.cc_answered),
      queue: num(row?.queue),
      anomalies: anomaliesLive
        ? { none: num(anomalySource.an_no) ?? 0, low: num(anomalySource.an_low) ?? 0, spike: num(anomalySource.an_spike) ?? 0 }
        : null,
      anomaliesAsOf,
      repeatCalls: num(row?.repeat_calls),
      reopened: num(row?.reopened),
      share: row
        ? {
            noSupply: num(row.i_no_gas) ?? 0,
            leak: impactSum(row, ['i_leak_appliance', 'i_leak_flat', 'i_leak_pipe', 'i_leak_stairwell', 'i_leak_street', 'i_leak_valve']),
            pressure: impactSum(row, ['i_low_pressure', 'i_low_pressure_days', 'i_high_pressure', 'i_unstable_pressure']),
            meter: impactSum(row, ['i_leak_meter', 'i_leak_meter_inlet']),
            other: impactSum(row, ['i_other', 'i_appliance_fault', 'i_broken_valve', 'i_co_poisoning', 'i_vehicle_damage', 'i_water_in_pipe', 'i_welding_needed']),
          }
        : null,
      open: num(row?.open),
      calls: num(row?.calls),
      closed: num(row?.closed),
      crmSla: num(row?.crm_sla_1),
      heat: heatRows.map((item) => ({
        rqii: item.rqii,
        month: String(item.month),
        serviceLevel: num(item.service_level),
      })),
      calibration: calibrationBody(calibrationRow),
      calibrationAsOf,
      operations: operationsBody(operationsRow),
    });
  } catch (error) {
    next(error);
  }
});

const tamperNames = {
  'Device tamper detection start': 'tampering',
  'Disassembly detected': 'disassembly',
  'External field application interfering end': 'interference',
  'Magnetic interference detected': 'magnetic',
  'Unauthorized battery remove': 'battery',
};

app.get('/api/tamper', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const rows = await query(
      'tampering_events.duckdb',
      `SELECT "Event Name" AS name, count(*)::DOUBLE AS n
       FROM "Combined Events"
       WHERE "Entry Timestamp" >= CAST($1 AS TIMESTAMP)
         AND "Entry Timestamp" < CAST($2 AS DATE) + INTERVAL 1 DAY
       GROUP BY 1`,
      [from, to],
    );
    const counts = { tampering: 0, disassembly: 0, interference: 0, magnetic: 0, battery: 0 };
    for (const row of rows) {
      const key = tamperNames[row.name];
      if (key) counts[key] = num(row.n) ?? 0;
    }
    res.json(counts);
  } catch (error) {
    next(error);
  }
});

app.get('/api/leaks', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const raw = String(req.query.clusters || '');
    const clusters = raw ? raw.split(',') : [];
    if (clusters.length > 80 || clusters.some((cluster) => !/^\d+$/.test(cluster))) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const filter = clusters.length ? `AND "Cluster" IN (${clusters.map((_, index) => `$${index + 3}`).join(', ')})` : '';
    const [row] = await query(
      'leak.duckdb',
      `SELECT
         count(*)::DOUBLE AS suspected,
         count(*) FILTER (WHERE "Ranges" = 'Grade A')::DOUBLE AS grade_a,
         count(*) FILTER (WHERE "Ranges" = 'Grade B')::DOUBLE AS grade_b,
         count(*) FILTER (WHERE "Ranges" = 'Grade C')::DOUBLE AS grade_c
       FROM leaks
       WHERE "Date" >= $1::DATE AND "Date" <= $2::DATE
         ${filter}`,
      [from, to, ...clusters],
    );
    res.json({
      suspected: num(row?.suspected) ?? 0,
      grades: {
        'Grade A': num(row?.grade_a) ?? 0,
        'Grade B': num(row?.grade_b) ?? 0,
        'Grade C': num(row?.grade_c) ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

const accidentRegions = new Set([
  'Ağsu RQİİ',
  'Bakı RQİİ',
  'Gəncə RQİİ',
  'Lənkəran RQİİ',
  'Qarabağ RQİİ',
  'Salyan RQİİ',
  'Sumqayıt RQİİ',
  'Şəmkir RQİİ',
  'Tərtər RQİİ',
  'Xaçmaz RQİİ',
  'Zaqatala RQİİ',
]);

const accidentRayons = new Set(['Sumqayıt', 'Ağsu', 'İsmayıllı', 'Kürdəmir', 'Ucar']);

function nextIsoDay(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function accidentCallsSql(window) {
  return `
    WITH people AS (
      SELECT DISTINCT ON (id) id, cluster
      FROM (
        SELECT btrim("SUBID_") AS id, btrim("Klaster Nömrəsi") AS cluster, 1 AS src
        FROM consumers."ƏHALİ"
        UNION ALL
        SELECT btrim("SUBID_"), btrim("Klaster Nömrəsi"), 2
        FROM consumers."QEYRİ-ƏHALİ"
      ) s
      WHERE id <> '' AND cluster ~ '^[0-9]+$'
      ORDER BY id, src
    ),
    raw AS (
      SELECT
        btrim(a."Qeydiyyat tarixi") AS registered,
        btrim(a."Status") AS status,
        btrim(a."Kategoriya") AS category,
        btrim(a."Alt Kategoriya") AS alt,
        NULLIF(btrim(a."Abonent kodu"), '') AS code,
        NULLIF(btrim(a."Qəbul tarixi"), '') AS accepted,
        CASE
          WHEN btrim(a."Ümumi vaxt") ~ '^[0-9]+([.][0-9]+)?'
          THEN substring(btrim(a."Ümumi vaxt") from '^[0-9]+([.][0-9]+)?')::numeric
        END AS minutes,
        btrim(a."Region") AS region,
        p.cluster
      FROM mfs.accident_call a
      LEFT JOIN people p ON p.id = NULLIF(btrim(a."Abonent kodu"), '')
      WHERE btrim(a."Qeydiyyat tarixi") >= $1
        AND btrim(a."Qeydiyyat tarixi") < $2
        AND ($3 = '' OR btrim(a."Region") = $3)
        AND ($4 = '' OR btrim(a."Rayon") = $4)
        AND ($5 = '' OR p.cluster = $5)
    ),
    calls AS (
      SELECT
        *,
        CASE
          WHEN alt LIKE '%Sayğac%' OR alt LIKE '%sayğac%' THEN 'meter'
          WHEN alt IN ('Qaz Gəlmir', 'Qaz borusu tutulub') THEN 'supply'
          WHEN category = 'Təzyiq' THEN 'pressure'
          WHEN category IN ('Qaz sızma/Qaz iyi', 'Sızma Sənaye') THEN 'leak'
          ELSE 'other'
        END AS bucket,
        CASE WHEN code IS NULL THEN 1 ELSE count(*) OVER (PARTITION BY code) END AS call_count,
        CASE WHEN code IS NULL THEN 1 ELSE row_number() OVER (PARTITION BY code ORDER BY registered) END AS seq,
        CASE
          WHEN code IS NULL THEN false
          ELSE coalesce(bool_or(status = 'Tamamlanıb') OVER (
            PARTITION BY code ORDER BY registered
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ), false)
        END AS had_completed
      FROM raw
    )
    ${window}
  `;
}

app.get('/api/accident-impact', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const region = String(req.query.region || '');
    const rayon = String(req.query.rayon || '');
    const cluster = String(req.query.cluster || '');
    if ((region && !accidentRegions.has(region)) || (rayon && !accidentRayons.has(rayon)) || (cluster && !/^\d{1,4}$/.test(cluster))) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const end = nextIsoDay(to);
    const year = Number(from.slice(0, 4));
    const scope = [region, rayon, cluster];
    const [row] = await query(
      'mfs.duckdb',
      accidentCallsSql(`
        SELECT
          count(*)::float8 AS calls,
          count(DISTINCT code)::float8 AS affected,
          count(*) FILTER (WHERE category IN ('Yanğın', 'Partlayış', 'Dəm qazı'))::float8 AS serious,
          count(*) FILTER (WHERE accepted IS NOT NULL)::float8 AS answered,
          count(*) FILTER (WHERE status NOT IN ('Tamamlanıb', 'Passiv', 'Aşkar olunmadı', 'Təmirə göndərildi'))::float8 AS open,
          count(*) FILTER (WHERE status = 'Tamamlanıb')::float8 AS closed,
          count(*) FILTER (WHERE status = 'Təmirə göndərildi')::float8 AS escalated,
          count(*) FILTER (WHERE status = 'Tamamlanıb' AND call_count = 1)::float8 AS first_resolved,
          count(*) FILTER (WHERE status = 'Tamamlanıb' AND minutes <= 60)::float8 AS closed_hour,
          count(*) FILTER (WHERE seq > 1)::float8 AS repeat_calls,
          count(*) FILTER (WHERE seq > 1 AND had_completed)::float8 AS reopened,
          count(*) FILTER (WHERE bucket = 'supply')::float8 AS no_supply,
          count(*) FILTER (WHERE bucket = 'leak')::float8 AS leak,
          count(*) FILTER (WHERE bucket = 'pressure')::float8 AS pressure,
          count(*) FILTER (WHERE bucket = 'meter')::float8 AS meter,
          count(*) FILTER (WHERE bucket = 'other')::float8 AS other
        FROM calls
      `),
      [from, end, ...scope],
    );
    const heatRows = await query(
      'mfs.duckdb',
      `
        SELECT
          btrim("Region") AS rqii,
          substring(btrim("Qeydiyyat tarixi") from 6 for 2) AS month,
          count(*) FILTER (WHERE btrim("Status") = 'Tamamlanıb')::float8 AS done,
          count(*)::float8 AS n
        FROM mfs.accident_call a
        LEFT JOIN (
          SELECT DISTINCT ON (id) id, cluster
          FROM (
            SELECT btrim("SUBID_") AS id, btrim("Klaster Nömrəsi") AS cluster, 1 AS src
            FROM consumers."ƏHALİ"
            UNION ALL
            SELECT btrim("SUBID_"), btrim("Klaster Nömrəsi"), 2
            FROM consumers."QEYRİ-ƏHALİ"
          ) s
          WHERE id <> '' AND cluster ~ '^[0-9]+$'
          ORDER BY id, src
        ) p ON p.id = NULLIF(btrim(a."Abonent kodu"), '')
        WHERE btrim(a."Qeydiyyat tarixi") >= $1
          AND btrim(a."Qeydiyyat tarixi") < $2
          AND ($3 = '' OR btrim(a."Region") = $3)
          AND ($4 = '' OR btrim(a."Rayon") = $4)
          AND ($5 = '' OR p.cluster = $5)
        GROUP BY 1, 2
      `,
      [`${year}-01-01`, `${year + 1}-01-01`, ...scope],
    );
    const calls = num(row?.calls) ?? 0;
    const pct = (part) => (calls > 0 ? ((num(part) ?? 0) / calls) * 100 : null);
    res.json({
      serviceLevel: pct(row?.closed),
      affected: num(row?.affected) ?? 0,
      serious: num(row?.serious) ?? 0,
      fcr: pct(row?.first_resolved),
      answered: num(row?.answered) ?? 0,
      queue: num(row?.open) ?? 0,
      repeatCalls: num(row?.repeat_calls) ?? 0,
      reopened: num(row?.reopened) ?? 0,
      share: {
        noSupply: num(row?.no_supply) ?? 0,
        leak: num(row?.leak) ?? 0,
        pressure: num(row?.pressure) ?? 0,
        meter: num(row?.meter) ?? 0,
        other: num(row?.other) ?? 0,
      },
      open: num(row?.open) ?? 0,
      calls,
      closed: num(row?.closed) ?? 0,
      escalated: num(row?.escalated) ?? 0,
      crmSla: pct(row?.closed_hour),
      heat: heatRows.map((item) => ({
        rqii: item.rqii,
        month: String(item.month),
        serviceLevel: (num(item.n) ?? 0) > 0 ? ((num(item.done) ?? 0) / num(item.n)) * 100 : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

const fieldRayons = new Set(['Sumqayıt', 'Ağsu', 'İsmayıllı', 'Kürdəmir', 'Ucar', 'Sabunçu']);

function fieldClusterSql(column) {
  return `AND EXISTS (
    SELECT 1 FROM people p
    WHERE p.id = NULLIF(btrim(${column}), '')
      AND p.cluster = $5
  )`;
}

function fieldOpsSql(cluster) {
  const people = cluster
    ? `
    WITH people AS (
      SELECT DISTINCT ON (id) id, cluster
      FROM (
        SELECT btrim("SUBID_") AS id, btrim("Klaster Nömrəsi") AS cluster, 1 AS src
        FROM consumers."ƏHALİ"
        UNION ALL
        SELECT btrim("SUBID_"), btrim("Klaster Nömrəsi"), 2
        FROM consumers."QEYRİ-ƏHALİ"
      ) s
      WHERE id <> '' AND cluster ~ '^[0-9]+$'
      ORDER BY id, src
    )`
    : '';
  const match = (column) => (cluster ? fieldClusterSql(column) : '');
  return `
    ${people}
    SELECT
      acc.calls, acc.resolved, acc.leaks, acc.tamper, acc.emergency,
      op.n AS reconnection, op.done AS reconnection_done, op.same_day AS reconnection_same,
      cl.n AS disconnection, cl.within7 AS disconnection_within7, cl.cut_off AS meter_cut,
      rp.n AS replacements, rp.same_day AS replacement_same,
      rg.n AS regulators
    FROM (
      SELECT
        count(*)::float8 AS calls,
        count(*) FILTER (WHERE btrim(coalesce("Bitirmə tarixi", '')) <> '')::float8 AS resolved,
        count(*) FILTER (WHERE btrim("Kategoriya") = 'Qaz sızma/Qaz iyi')::float8 AS leaks,
        count(*) FILTER (
          WHERE coalesce("Görülmüş işler", '') ILIKE '%müdaxilə%'
             OR coalesce("İcraçının qeydləri", '') ILIKE '%müdaxilə%'
        )::float8 AS tamper,
        count(*) FILTER (WHERE btrim("Kategoriya") IN ('Yanğın', 'Partlayış', 'Dəm qazı'))::float8 AS emergency
      FROM mfs.accident_call
      WHERE btrim("Qeydiyyat tarixi") >= $1
        AND btrim("Qeydiyyat tarixi") < $2
        AND ($3 = '' OR btrim("Region") = $3)
        AND ($4 = '' OR btrim("Rayon") = $4)
        ${match('"Abonent kodu"')}
    ) acc,
    (
      SELECT
        count(*)::float8 AS n,
        count(*) FILTER (WHERE status = 'Tamamlandı')::float8 AS done,
        count(*) FILTER (WHERE loaded IS NOT NULL AND cut IS NOT NULL AND loaded = cut)::float8 AS same_day
      FROM (
        SELECT
          CASE WHEN btrim("Yüklənmə tarixi") ~ '^[0-9]{2}[.][0-9]{2}[.][0-9]{4}'
            THEN to_date(substring(btrim("Yüklənmə tarixi") from '^[0-9]{2}[.][0-9]{2}[.][0-9]{4}'), 'DD.MM.YYYY')
          END AS loaded,
          CASE WHEN btrim("Kəsilmə tarixi") ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            THEN substring(btrim("Kəsilmə tarixi") from '^[0-9]{4}-[0-9]{2}-[0-9]{2}')::date
          END AS cut,
          btrim("Cari status") AS status
        FROM mfs.meter_opening
        WHERE ($3 = '' OR btrim("Region") = $3)
          AND ($4 = '' OR btrim("Rayon") = $4)
          ${match('"Abonent kodu"')}
      ) opened
      WHERE loaded >= $1::date AND loaded < $2::date
    ) op,
    (
      SELECT
        count(*)::float8 AS n,
        count(*) FILTER (WHERE loaded IS NOT NULL AND cut IS NOT NULL AND abs(cut - loaded) < 7)::float8 AS within7,
        count(*) FILTER (WHERE result = 'Qaz kəsildi (plombla)')::float8 AS cut_off
      FROM (
        SELECT
          CASE WHEN btrim("Yüklənmə tarixi") ~ '^[0-9]{2}[.][0-9]{2}[.][0-9]{4}'
            THEN to_date(substring(btrim("Yüklənmə tarixi") from '^[0-9]{2}[.][0-9]{2}[.][0-9]{4}'), 'DD.MM.YYYY')
          END AS loaded,
          CASE WHEN btrim("Kəsilmə tarixi") ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            THEN substring(btrim("Kəsilmə tarixi") from '^[0-9]{4}-[0-9]{2}-[0-9]{2}')::date
          END AS cut,
          btrim("Kəsilmə nəticəsi") AS result
        FROM mfs.meter_closing
        WHERE ($3 = '' OR btrim("Region") = $3)
          AND ($4 = '' OR btrim("Rayon") = $4)
          ${match('"Abonent kodu"')}
      ) closed
      WHERE loaded >= $1::date AND loaded < $2::date
    ) cl,
    (
      SELECT
        count(*)::float8 AS n,
        count(*) FILTER (WHERE born IS NOT NULL AND finished IS NOT NULL AND born = finished)::float8 AS same_day
      FROM (
        SELECT
          CASE WHEN btrim("Yaranma tarixi") ~ '^[0-9]+([.][0-9]+)?$'
            THEN DATE '1899-12-30' + floor(btrim("Yaranma tarixi")::numeric)::int
          END AS born,
          CASE WHEN btrim("Tamamlanma tarixi") ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            THEN substring(btrim("Tamamlanma tarixi") from '^[0-9]{4}-[0-9]{2}-[0-9]{2}')::date
          END AS finished
        FROM mfs.meter_replacement
        WHERE ($3 = '' OR btrim("Region") = $3)
          AND ($4 = '' OR btrim("Rayon") = $4)
          ${match('"Abonent kodu"')}
      ) replaced
      WHERE born >= $1::date AND born < $2::date
    ) rp,
    (
      SELECT count(DISTINCT NULLIF(btrim("Qurğu"), ''))::float8 AS n
      FROM mfs.plan_regulator
      WHERE btrim("Yoxlama tarixi") >= $1
        AND btrim("Yoxlama tarixi") < $2
        AND ($3 = '' OR btrim("Region") = $3)
        AND ($4 = '' OR btrim("Rayon") = $4)
    ) rg
  `;
}

app.get('/api/field-ops', async (req, res, next) => {
  try {
    const from = dayOrThrow(req.query.from, 'from');
    const to = dayOrThrow(req.query.to, 'to');
    if (from > to) {
      const error = new Error('from must be on or before to');
      error.status = 400;
      throw error;
    }
    const region = String(req.query.region || '');
    const rayon = String(req.query.rayon || '');
    const cluster = String(req.query.cluster || '');
    if ((region && !accidentRegions.has(region)) || (rayon && !fieldRayons.has(rayon)) || (cluster && !/^\d{1,4}$/.test(cluster))) {
      const error = new Error('bad scope');
      error.status = 400;
      throw error;
    }
    const params = [from, nextIsoDay(to), region, rayon];
    if (cluster) params.push(cluster);
    const [row] = await query('mfs.duckdb', fieldOpsSql(Boolean(cluster)), params);
    res.json({
      calls: num(row?.calls) ?? 0,
      resolved: num(row?.resolved) ?? 0,
      leaks: num(row?.leaks) ?? 0,
      tamper: num(row?.tamper) ?? 0,
      emergency: num(row?.emergency) ?? 0,
      reconnection: num(row?.reconnection) ?? 0,
      reconnectionDone: num(row?.reconnection_done) ?? 0,
      reconnectionSameDay: num(row?.reconnection_same) ?? 0,
      disconnection: num(row?.disconnection) ?? 0,
      disconnectionWithin7: num(row?.disconnection_within7) ?? 0,
      meterCut: num(row?.meter_cut) ?? 0,
      replacements: num(row?.replacements) ?? 0,
      replacementSameDay: num(row?.replacement_same) ?? 0,
      regulators: cluster ? null : (num(row?.regulators) ?? 0),
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: error.message || 'Query failed' });
});

export { app };
