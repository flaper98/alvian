// Copia toda la base de datos de Alvian de una base Postgres a otra (p. ej. de
// Neon a Supabase). Uso, con las direcciones solo en tu computadora:
//
//   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node scripts/copy-database.mjs
//
// 1. Crea en el destino las mismas tablas que crea el sistema (lib/db.js).
// 2. Copia cada tabla con sus mismos ids, en orden (padres antes que hijos).
// 3. Ajusta los contadores de ids y compara cuántas filas hay en cada lado.
// Por seguridad no hace nada si el destino ya tiene perfumes o ventas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool, types } = pg;
// Fechas y horas tal cual vienen (texto): así no cambian de día por la zona horaria.
types.setTypeParser(1082, (value) => value); // date
types.setTypeParser(1114, (value) => value); // timestamp sin zona
types.setTypeParser(1184, (value) => value); // timestamptz

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;
if (!SOURCE || !TARGET) {
  console.error('Falta SOURCE_DATABASE_URL (origen) o TARGET_DATABASE_URL (destino).');
  process.exit(1);
}
if (SOURCE === TARGET) {
  console.error('El origen y el destino son la misma base de datos.');
  process.exit(1);
}

// Conexión cifrada sin exigir verificar el certificado (Supabase lo necesita
// con "pg"); el sslmode de la URL se quita porque si no pisaría esta opción.
function connect(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 1 });
}
const source = connect(SOURCE);
const target = connect(TARGET);

const q = (name) => `"${name.replace(/"/g, '""')}"`;

/** El SQL que arma todas las tablas, tomado de ensureSchema() en lib/db.js. */
function schemaSql() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const code = fs.readFileSync(path.join(here, '..', 'lib', 'db.js'), 'utf8');
  const match = code.match(/schemaReady = getPool\(\)\.query\(`([\s\S]*?)`\)\.catch/);
  if (!match) throw new Error('No encontré el SQL de ensureSchema en lib/db.js.');
  return match[1];
}

async function tables(pool) {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  return rows.map((r) => r.table_name);
}

async function columns(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

/** Orden de copia: cada tabla después de las tablas a las que apunta. */
async function copyOrder(pool, names) {
  const { rows } = await pool.query(`
    SELECT tc.relname AS child, tp.relname AS parent
    FROM pg_constraint c
    JOIN pg_class tc ON tc.oid = c.conrelid
    JOIN pg_class tp ON tp.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = tc.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
  `);
  const parents = new Map(names.map((t) => [t, new Set()]));
  for (const { child, parent } of rows) {
    if (child !== parent && parents.has(child) && parents.has(parent)) parents.get(child).add(parent);
  }
  const ordered = [];
  const visit = (t, stack = new Set()) => {
    if (ordered.includes(t) || stack.has(t)) return;
    stack.add(t);
    for (const p of parents.get(t)) visit(p, stack);
    ordered.push(t);
  };
  names.forEach((t) => visit(t));
  return ordered;
}

async function count(pool, table) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${q(table)}`);
  return rows[0].n;
}

async function main() {
  console.log('1) Creando las tablas en el destino…');
  await target.query(schemaSql());

  const [srcTables, dstTables] = await Promise.all([tables(source), tables(target)]);
  for (const guard of ['perfumes', 'sales']) {
    if (dstTables.includes(guard) && (await count(target, guard)) > 0 && !process.argv.includes('--force')) {
      throw new Error(`El destino ya tiene datos en "${guard}". No copio nada para no mezclar.`);
    }
  }
  const missing = srcTables.filter((t) => !dstTables.includes(t));
  if (missing.length) console.warn('   Estas tablas no existen en el destino y se saltan:', missing.join(', '));
  const order = await copyOrder(source, srcTables.filter((t) => dstTables.includes(t)));

  console.log('2) Copiando datos…');
  const client = await target.connect();
  try {
    await client.query('BEGIN');
    // El destino se vacía primero (tablas creadas por el sistema, aún sin datos).
    await client.query(`TRUNCATE ${order.map(q).join(', ')} RESTART IDENTITY CASCADE`);
    for (const table of order) {
      // Las columnas del destino se leen con la misma conexión de la transacción
      // (el pool tiene una sola: pedir otra la dejaría esperando para siempre).
      const [srcCols, dstCols] = await Promise.all([columns(source, table), columns(client, table)]);
      const cols = srcCols.filter((c) => dstCols.includes(c));
      const { rows } = await source.query(`SELECT ${cols.map(q).join(', ')} FROM ${q(table)}`);
      for (let start = 0; start < rows.length; start += 200) {
        const batch = rows.slice(start, start + 200);
        const values = [];
        const tuples = batch.map((row) => {
          const marks = cols.map((c) => {
            values.push(row[c]);
            return `$${values.length}`;
          });
          return `(${marks.join(', ')})`;
        });
        await client.query(`INSERT INTO ${q(table)} (${cols.map(q).join(', ')}) VALUES ${tuples.join(', ')}`, values);
      }
      console.log(`   ${table}: ${rows.length}`);
    }

    // Los ids nuevos siguen después del último copiado.
    const { rows: serials } = await client.query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'
    `);
    for (const { table_name: table, column_name: column } of serials) {
      if (!order.includes(table)) continue;
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX(${q(column)}), 1), MAX(${q(column)}) IS NOT NULL)
         FROM ${q(table)}`,
        [table, column],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  console.log('3) Comparando filas origen → destino…');
  let ok = true;
  for (const table of order) {
    const [a, b] = await Promise.all([count(source, table), count(target, table)]);
    if (a !== b) ok = false;
    console.log(`   ${a === b ? '✓' : '✗'} ${table}: ${a} → ${b}`);
  }
  console.log(ok ? '\nListo: todo copiado.' : '\nOJO: hay tablas con distinta cantidad de filas.');
}

main()
  .catch((error) => {
    console.error('\nError:', error.message);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([source.end(), target.end()]));
