import { getPool, ensureSchema } from './db';
import { SHIPMENT_DIRECTIONS, SHIPMENT_STATUSES } from './shalom';

const SHIPMENT_COLUMNS = `s.id, s.direction, s.order_number, s.order_code, s.status, s.contact_name,
  s.contact_phone, s.origin, s.destination, s.note, s.web_order_id, s.supplier_id, s.created_at,
  s.updated_at`;

async function attachEvents(shipments) {
  if (shipments.length === 0) return shipments;
  const { rows } = await getPool().query(
    `SELECT id, shipment_id, status, note, created_at FROM shalom_shipment_events
     WHERE shipment_id = ANY($1::int[]) ORDER BY created_at, id`,
    [shipments.map((s) => s.id)],
  );
  const byShipment = new Map(shipments.map((s) => [s.id, []]));
  for (const row of rows) byShipment.get(row.shipment_id)?.push(row);
  return shipments.map((s) => ({ ...s, events: byShipment.get(s.id) || [] }));
}

function validate(input) {
  if (!SHIPMENT_DIRECTIONS[input.direction]) throw new Error('Indica si es un envío a cliente o un recibo.');
  if (!/^\d{5,12}$/.test(input.orderNumber)) {
    throw new Error('El N° de orden de Shalom debe tener solo números (normalmente 8 a 10).');
  }
  if (!/^[A-Z0-9]{3,8}$/.test(input.orderCode)) {
    throw new Error('El código de orden de Shalom debe tener letras o números (normalmente 4).');
  }
  if (!SHIPMENT_STATUSES[input.status]) throw new Error('Estado no válido.');
}

function duplicateError(error) {
  if (error.code === '23505') {
    return new Error('Ya registraste un envío con ese N° de orden y código.');
  }
  return error;
}

// Al ligar un envío a un pedido web ya pagado, el pedido pasa a "Enviado" (así
// el cliente lo ve en su seguimiento). No se toca un pedido pendiente,
// entregado o cancelado.
async function markWebOrderSent(client, webOrderId) {
  if (!webOrderId) return;
  await client.query(
    `UPDATE web_orders SET status = 'enviado', updated_at = now()
     WHERE id = $1 AND status IN ('pagado', 'preparando')`,
    [webOrderId],
  );
}

export async function listShipments() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT ${SHIPMENT_COLUMNS}, w.code AS web_order_code, w.customer_name AS web_order_customer,
           sp.name AS supplier_name
    FROM shalom_shipments s
    LEFT JOIN web_orders w ON w.id = s.web_order_id
    LEFT JOIN suppliers sp ON sp.id = s.supplier_id
    ORDER BY s.updated_at DESC
    LIMIT 500
  `);
  return attachEvents(rows);
}

export async function createShipment(input) {
  await ensureSchema();
  validate(input);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO shalom_shipments (direction, order_number, order_code, status, contact_name,
         contact_phone, origin, destination, note, web_order_id, supplier_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        input.direction,
        input.orderNumber,
        input.orderCode,
        input.status,
        input.contactName || null,
        input.contactPhone || null,
        input.origin || null,
        input.destination || null,
        input.note || null,
        input.direction === 'saliente' ? input.webOrderId || null : null,
        input.direction === 'entrante' ? input.supplierId || null : null,
      ],
    );
    await client.query('INSERT INTO shalom_shipment_events (shipment_id, status) VALUES ($1, $2)', [
      rows[0].id,
      input.status,
    ]);
    if (input.direction === 'saliente') await markWebOrderSent(client, input.webOrderId);
    await client.query('COMMIT');
    return rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw duplicateError(error);
  } finally {
    client.release();
  }
}

export async function updateShipment(id, input) {
  await ensureSchema();
  validate(input);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(
      'SELECT status, web_order_id FROM shalom_shipments WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (!existing[0]) throw new Error('El envío no existe.');
    const webOrderId = input.direction === 'saliente' ? input.webOrderId || null : null;
    await client.query(
      `UPDATE shalom_shipments
       SET direction = $1, order_number = $2, order_code = $3, status = $4, contact_name = $5,
           contact_phone = $6, origin = $7, destination = $8, note = $9, web_order_id = $10,
           supplier_id = $11, updated_at = now()
       WHERE id = $12`,
      [
        input.direction,
        input.orderNumber,
        input.orderCode,
        input.status,
        input.contactName || null,
        input.contactPhone || null,
        input.origin || null,
        input.destination || null,
        input.note || null,
        webOrderId,
        input.direction === 'entrante' ? input.supplierId || null : null,
        id,
      ],
    );
    if (existing[0].status !== input.status) {
      await client.query('INSERT INTO shalom_shipment_events (shipment_id, status) VALUES ($1, $2)', [
        id,
        input.status,
      ]);
    }
    if (webOrderId && webOrderId !== existing[0].web_order_id) {
      await markWebOrderSent(client, webOrderId);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw duplicateError(error);
  } finally {
    client.release();
  }
}

/** Cambio rápido de estado desde la lista, con una nota opcional para el historial. */
export async function setShipmentStatus(id, status, note) {
  await ensureSchema();
  if (!SHIPMENT_STATUSES[status]) throw new Error('Estado no válido.');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE shalom_shipments SET status = $1, updated_at = now() WHERE id = $2 RETURNING id',
      [status, id],
    );
    if (!rows[0]) throw new Error('El envío no existe.');
    await client.query(
      'INSERT INTO shalom_shipment_events (shipment_id, status, note) VALUES ($1, $2, $3)',
      [id, status, note || null],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteShipment(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM shalom_shipments WHERE id = $1', [id]);
}

/** Pedidos web que se pueden ligar a un envío (los más recientes, sin cancelar). */
export async function listLinkableWebOrders() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT id, code, customer_name, phone, district, department, status
    FROM web_orders WHERE status <> 'cancelado'
    ORDER BY created_at DESC LIMIT 150
  `);
  return rows;
}

/** Envíos Shalom ligados a cada pedido web (para el panel y el seguimiento del cliente). */
export async function attachShipmentsToWebOrders(orders) {
  if (orders.length === 0) return orders;
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT ${SHIPMENT_COLUMNS} FROM shalom_shipments s
     WHERE s.web_order_id = ANY($1::int[]) ORDER BY s.created_at`,
    [orders.map((o) => o.id)],
  );
  const shipments = await attachEvents(rows);
  const byOrder = new Map(orders.map((o) => [o.id, []]));
  for (const shipment of shipments) byOrder.get(shipment.web_order_id)?.push(shipment);
  return orders.map((o) => ({ ...o, shipments: byOrder.get(o.id) || [] }));
}
