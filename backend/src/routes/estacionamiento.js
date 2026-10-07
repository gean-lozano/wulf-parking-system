const router = require('express').Router();
const { query, withTransaction } = require('../db');
const { wrap, bad, notFound, conflict } = require('../errors');
const { placa: vPlaca, int } = require('../validators');
const { calcularCobro, desglosarIgv } = require('../billing');
const { getParametros } = require('./parametros');

/** Estado general: ocupados/libres y, si se asignan casilleros, el mapa de espacios. */
router.get('/estado', wrap(async (_req, res) => {
  const par = await getParametros();
  const { rows } = await query(
    `SELECT v.id, v.placa, v.espacio, v.horaentrada, p.nombre AS producto
       FROM vehiculo v JOIN producto p ON p.id = v.producto_id WHERE v.estado = 'en' ORDER BY v.horaentrada`);
  const out = {
    capacidad: par.capacidad,
    asignarcasillero: par.asignarcasillero,
    ocupados: rows.length,
    libres: Math.max(0, par.capacidad - rows.length),
    dentro: rows,
  };
  if (par.asignarcasillero) {
    const porEspacio = new Map(rows.map((r) => [r.espacio, r]));
    out.espacios = Array.from({ length: par.capacidad }, (_, i) => {
      const n = i + 1;
      const v = porEspacio.get(n);
      return { numero: n, ocupado: !!v, placa: v?.placa ?? null, producto: v?.producto ?? null };
    });
  }
  res.json(out);
}));

/** Ingreso de un vehículo. */
router.post('/ingreso', wrap(async (req, res) => {
  const placa = vPlaca(req.body.placa);
  const productoId = int(req.body.producto_id, 'producto');
  const vehiculo = await withTransaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(7001)'); // evita pasarse de la capacidad con ingresos simultáneos
    const par = await getParametros((t, p) => c.query(t, p));
    const prod = (await c.query('SELECT id FROM producto WHERE id=$1 AND activo', [productoId])).rows[0];
    if (!prod) throw bad('El producto no existe');
    const { rows: cnt } = await c.query("SELECT COUNT(*)::int AS n FROM vehiculo WHERE estado='en'");
    if (cnt[0].n >= par.capacidad) throw conflict('Estacionamiento lleno');
    let espacio = null;
    if (par.asignarcasillero) {
      espacio = int(req.body.espacio, 'espacio', { min: 1, max: par.capacidad });
    }
    try {
      const { rows } = await c.query(
        `INSERT INTO vehiculo (placa, producto_id, espacio) VALUES ($1,$2,$3) RETURNING *`, [placa, productoId, espacio]);
      return rows[0];
    } catch (e) {
      if (e.code === '23505' && e.constraint === 'vehiculo_placa_en_uq') throw conflict(`El vehículo ${placa} se encuentra dentro del estacionamiento`);
      if (e.code === '23505' && e.constraint === 'vehiculo_espacio_en_uq') throw conflict(`El espacio ${espacio} ya está ocupado`);
      throw e;
    }
  });
  res.status(201).json(vehiculo);
}));

/** Busca el vehículo que está dentro por placa o por número de espacio. */
async function vehiculoDentro(q, { placa, espacio }, lock = false) {
  let where, val;
  if (placa) { where = 'v.placa = $1'; val = vPlaca(placa); }
  else if (espacio) { where = 'v.espacio = $1'; val = int(espacio, 'espacio', { min: 1 }); }
  else throw bad('Indica la placa o el espacio');
  const { rows } = await q(
    `SELECT v.*, p.nombre AS producto, p.tarifa, p.horas, p.sobreestadia, p.tolerancia
       FROM vehiculo v JOIN producto p ON p.id = v.producto_id
      WHERE ${where} AND v.estado = 'en' ${lock ? 'FOR UPDATE OF v' : ''}`, [val]);
  if (!rows[0]) throw notFound('No hay datos: el vehículo no está dentro del estacionamiento');
  return rows[0];
}

const cobrar = async (q, v, ahora) => {
  const par = await getParametros(q);
  const cobro = calcularCobro({ entrada: v.horaentrada, salida: ahora, ...v });
  return { cobro, desglose: desglosarIgv(cobro.valor, par.igv), igvPct: par.igv };
};

/** Vista previa de la salida (datos_salida): no modifica nada. */
router.get('/salida', wrap(async (req, res) => {
  const v = await vehiculoDentro(query, req.query);
  const ahora = (await query('SELECT NOW() AS t')).rows[0].t;
  const { cobro, desglose, igvPct } = await cobrar(query, v, ahora);
  res.json({ id: v.id, placa: v.placa, producto: v.producto, espacio: v.espacio,
    horaentrada: v.horaentrada, horasalida: ahora, horas: cobro.horasDentro, valor: cobro.valor, ...desglose, igvPct });
}));

/** Confirma la salida y fija el cobro. */
router.post('/salida', wrap(async (req, res) => {
  const out = await withTransaction(async (c) => {
    const q = (t, p) => c.query(t, p);
    const v = await vehiculoDentro(q, req.body, true);
    const ahora = (await q('SELECT NOW() AS t')).rows[0].t;
    const { cobro, desglose, igvPct } = await cobrar(q, v, ahora);
    await q("UPDATE vehiculo SET horasalida=$1, estado='fuera', valorpagado=$2 WHERE id=$3", [ahora, cobro.valor, v.id]);
    return { id: v.id, placa: v.placa, producto: v.producto, espacio: v.espacio,
      horaentrada: v.horaentrada, horasalida: ahora, horas: cobro.horasDentro, valor: cobro.valor, ...desglose, igvPct };
  });
  res.json(out);
}));

module.exports = router;
