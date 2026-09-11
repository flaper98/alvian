import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Falta configurar DATABASE_URL en las variables de entorno.');
    }
    pool = new Pool({ connectionString });
    attachDatabasePool(pool);
  }
  return pool;
}

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS perfumes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }
  return schemaReady;
}

export async function listPerfumes() {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT id, name, price, image_url, description, created_at FROM perfumes ORDER BY created_at DESC',
  );
  return rows;
}

export async function createPerfume({ name, price, imageUrl, description }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO perfumes (name, price, image_url, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, price, image_url, description, created_at`,
    [name, price, imageUrl, description || null],
  );
  return rows[0];
}

export async function updatePerfume(id, { name, price, imageUrl, description }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE perfumes
     SET name = $1, price = $2, image_url = $3, description = $4
     WHERE id = $5
     RETURNING id, name, price, image_url, description, created_at`,
    [name, price, imageUrl, description || null, id],
  );
  return rows[0];
}

export async function deletePerfume(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM perfumes WHERE id = $1', [id]);
}
