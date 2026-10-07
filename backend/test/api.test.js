// Prueba de integración: requiere PostgreSQL con la BD inicializada (npm run db:init).
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { pool } = require('../src/db');

let server; let base; let token;
const call = async (method, url, body, tk = token) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, body: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()), ct };
};

test.before(async () => {
  await pool.query('DELETE FROM vehiculo');
  server = app.listen(0); base = `http://localhost:${server.address().port}`;
});
test.after(async () => { server.close(); await pool.end(); });

test('login correcto e incorrecto', async () => {
  assert.strictEqual((await call('POST', '/api/auth/login', { usu: 'admin', contra: 'mala' }, null)).status, 401);
  const ok = await call('POST', '/api/auth/login', { usu: 'admin', contra: 'admin123' }, null);
  assert.strictEqual(ok.status, 200); token = ok.body.token;
  assert.strictEqual((await call('GET', '/api/productos', null, null)).status, 401);
});

test('ingreso -> estado -> salida sin casilleros', async () => {
  const prods = (await call('GET', '/api/productos')).body;
  const autos = prods.find((p) => p.nombre === 'autos');
  const r = await call('POST', '/api/estacionamiento/ingreso', { placa: 'asd-123', producto_id: autos.id });
  assert.strictEqual(r.status, 201); assert.strictEqual(r.body.placa, 'ASD-123');
  const dup = await call('POST', '/api/estacionamiento/ingreso', { placa: 'ASD-123', producto_id: autos.id });
  assert.strictEqual(dup.status, 409);
  const st = (await call('GET', '/api/estacionamiento/estado')).body;
  assert.strictEqual(st.ocupados, 1);
  const tk = await call('GET', `/api/vehiculos/${r.body.id}/ticket-entrada`);
  assert.strictEqual(tk.status, 200); assert.ok(tk.body.slice(0, 4).toString() === '%PDF');
  const prev = await call('GET', '/api/estacionamiento/salida?placa=ASD-123');
  assert.strictEqual(prev.body.valor, 10);
  const out = await call('POST', '/api/estacionamiento/salida', { placa: 'ASD-123' });
  assert.strictEqual(out.status, 200); assert.strictEqual(out.body.total, 10);
  assert.strictEqual((await call('POST', '/api/estacionamiento/salida', { placa: 'ASD-123' })).status, 404);
  const tks = await call('GET', `/api/vehiculos/${r.body.id}/ticket-salida`);
  assert.ok(tks.body.slice(0, 4).toString() === '%PDF');
  const lista = (await call('GET', '/api/vehiculos?estado=fuera&placa=asd')).body;
  assert.strictEqual(lista.items.length, 1); assert.strictEqual(lista.total, 10);
  const xl = await call('GET', '/api/vehiculos/export.xlsx');
  assert.strictEqual(xl.status, 200); assert.ok(xl.body.slice(0, 2).toString() === 'PK');
});

test('modo casilleros: espacio obligatorio y no repetido', async () => {
  const par = (await call('GET', '/api/parametros')).body;
  const up = await call('PUT', '/api/parametros', { ...par, asignarcasillero: true, capacidad: 3 });
  assert.strictEqual(up.status, 200);
  const prod = (await call('GET', '/api/productos')).body[0];
  assert.strictEqual((await call('POST', '/api/estacionamiento/ingreso', { placa: 'AAA111', producto_id: prod.id })).status, 400);
  assert.strictEqual((await call('POST', '/api/estacionamiento/ingreso', { placa: 'AAA111', producto_id: prod.id, espacio: 2 })).status, 201);
  assert.strictEqual((await call('POST', '/api/estacionamiento/ingreso', { placa: 'BBB222', producto_id: prod.id, espacio: 2 })).status, 409);
  const st = (await call('GET', '/api/estacionamiento/estado')).body;
  assert.strictEqual(st.espacios.length, 3); assert.strictEqual(st.espacios[1].ocupado, true);
  // no se puede cambiar el modo con vehículos dentro
  assert.strictEqual((await call('PUT', '/api/parametros', { ...par, asignarcasillero: false })).status, 409);
  assert.strictEqual((await call('POST', '/api/estacionamiento/salida', { espacio: 2 })).status, 200);
  assert.strictEqual((await call('PUT', '/api/parametros', { ...par, asignarcasillero: false })).status, 200);
});

test('productos: crear, modificar, eliminar y permisos de cajero', async () => {
  const c = await call('POST', '/api/productos', { nombre: 'camion', tarifa: 20, horas: 2, sobreestadia: 8, tolerancia: 0.25 });
  assert.strictEqual(c.status, 201);
  assert.strictEqual((await call('POST', '/api/productos', { nombre: 'CAMION', tarifa: 1, horas: 1, sobreestadia: 1, tolerancia: 0 })).status, 409);
  assert.strictEqual((await call('PUT', `/api/productos/${c.body.id}`, { ...c.body, tarifa: 22 })).body.tarifa, 22);
  const cj = await call('POST', '/api/usuarios', { usu: 'caja1', contra: 'secreto1', rol: 'cajero' });
  assert.strictEqual(cj.status === 201 || cj.status === 409, true);
  const lg = await call('POST', '/api/auth/login', { usu: 'caja1', contra: 'secreto1' }, null);
  assert.strictEqual((await call('DELETE', `/api/productos/${c.body.id}`, null, lg.body.token)).status, 403);
  assert.strictEqual((await call('DELETE', `/api/productos/${c.body.id}`)).status, 204);
});
