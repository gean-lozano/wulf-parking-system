const router = require('express').Router();
const { query } = require('../db');
const { requireRole } = require('../auth');
const { wrap, conflict } = require('../errors');
const { str, num, int, digits } = require('../validators');

const getParametros = async (q = query) => (await q('SELECT * FROM detalle_estacionamiento WHERE id = 1')).rows[0];

router.get('/', wrap(async (_req, res) => res.json(await getParametros())));

router.put('/', requireRole('admin'), wrap(async (req, res) => {
  const b = req.body;
  const data = {
    razon: str(b.razon, 'razón social', { max: 50 }),
    ruc: digits(b.ruc, 'RUC', 11),
    direccion: str(b.direccion, 'dirección', { max: 50 }),
    celular: digits(b.celular, 'celular', 9),
    comentario: str(b.comentario, 'comentario', { max: 300, optional: true }),
    igv: num(b.igv, 'IGV (%)', { min: 0, max: 100 }),
    capacidad: int(b.capacidad, 'capacidad', { min: 1, max: 5000 }),
    asignarcasillero: Boolean(b.asignarcasillero),
  };
  const actual = await getParametros();
  // Igual que el aviso original: para activar/desactivar casilleros no debe haber vehículos dentro
  if (actual.asignarcasillero !== data.asignarcasillero) {
    const { rows } = await query("SELECT COUNT(*)::int AS n FROM vehiculo WHERE estado = 'en'");
    if (rows[0].n > 0) throw conflict('Retira todos los vehículos antes de asignar o desasignar espacios');
  }
  if (data.capacidad < actual.capacidad && data.asignarcasillero) {
    const { rows } = await query("SELECT COUNT(*)::int AS n FROM vehiculo WHERE estado='en' AND espacio > $1", [data.capacidad]);
    if (rows[0].n > 0) throw conflict('Hay vehículos en espacios mayores a la nueva capacidad');
  }
  const { rows } = await query(
    `UPDATE detalle_estacionamiento SET razon=$1, ruc=$2, direccion=$3, celular=$4, comentario=$5,
       igv=$6, capacidad=$7, asignarcasillero=$8 WHERE id = 1 RETURNING *`,
    [data.razon, data.ruc, data.direccion, data.celular, data.comentario, data.igv, data.capacidad, data.asignarcasillero]);
  res.json(rows[0]);
}));

module.exports = router;
module.exports.getParametros = getParametros;
