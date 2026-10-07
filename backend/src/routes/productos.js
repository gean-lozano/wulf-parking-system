const router = require('express').Router();
const { query } = require('../db');
const { requireRole } = require('../auth');
const { wrap, notFound, conflict } = require('../errors');
const { str, num, int } = require('../validators');

function parse(b) {
  return {
    nombre: str(b.nombre, 'nombre', { max: 20 }),
    tarifa: num(b.tarifa, 'tarifa', { min: 0, max: 99999 }),
    horas: num(b.horas, 'horas', { min: 0.01, max: 9999 }),
    sobreestadia: num(b.sobreestadia, 'tarifa de sobreestadia', { min: 0, max: 99999 }),
    tolerancia: num(b.tolerancia ?? 0, 'tolerancia', { min: 0, max: 1 }), // 0.25 = 15 min
  };
}

router.get('/', wrap(async (_req, res) => {
  const { rows } = await query('SELECT * FROM producto WHERE activo ORDER BY id');
  res.json(rows);
}));

router.post('/', requireRole('admin'), wrap(async (req, res) => {
  const p = parse(req.body);
  try {
    const { rows } = await query(
      'INSERT INTO producto (nombre, tarifa, horas, sobreestadia, tolerancia) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [p.nombre, p.tarifa, p.horas, p.sobreestadia, p.tolerancia]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') throw conflict(`Ya existe un producto llamado "${p.nombre}"`);
    throw e;
  }
}));

router.put('/:id', requireRole('admin'), wrap(async (req, res) => {
  const id = int(req.params.id, 'id');
  const p = parse(req.body);
  try {
    const { rows } = await query(
      `UPDATE producto SET nombre=$1, tarifa=$2, horas=$3, sobreestadia=$4, tolerancia=$5
       WHERE id=$6 AND activo RETURNING *`, [p.nombre, p.tarifa, p.horas, p.sobreestadia, p.tolerancia, id]);
    if (!rows[0]) throw notFound('No hay producto a modificar');
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') throw conflict(`Ya existe un producto llamado "${p.nombre}"`);
    throw e;
  }
}));

router.delete('/:id', requireRole('admin'), wrap(async (req, res) => {
  const id = int(req.params.id, 'id');
  const { rows: dentro } = await query("SELECT COUNT(*)::int AS n FROM vehiculo WHERE producto_id=$1 AND estado='en'", [id]);
  if (dentro[0].n > 0) throw conflict('Retira todos los vehículos que tienen el producto antes de eliminarlo');
  // borrado lógico: el historial de vehículos conserva su producto
  const { rowCount } = await query('UPDATE producto SET activo = FALSE WHERE id = $1 AND activo', [id]);
  if (!rowCount) throw notFound('No hay producto a eliminar');
  res.status(204).end();
}));

module.exports = router;
