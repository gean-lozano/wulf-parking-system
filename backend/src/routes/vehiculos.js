const router = require('express').Router();
const ExcelJS = require('exceljs');
const config = require('../config');
const { query } = require('../db');
const { wrap, notFound } = require('../errors');
const { int, isoDate } = require('../validators');
const { calcularCobro, desglosarIgv } = require('../billing');
const { getParametros } = require('./parametros');
const { ticketEntrada, ticketSalida } = require('../pdf');

/** Construye WHERE para el listado (todo parametrizado: sin inyección SQL). */
function filtros(qs) {
  const w = []; const p = [];
  const add = (sql, v) => { p.push(v); w.push(sql.replace('?', `$${p.length}`)); };
  if (qs.estado === 'en' || qs.estado === 'fuera') add('v.estado = ?', qs.estado);
  if (qs.producto_id) add('v.producto_id = ?', int(qs.producto_id, 'producto'));
  if (qs.placa) add('v.placa ILIKE ?', `%${String(qs.placa).trim()}%`);
  const local = `(v.horaentrada AT TIME ZONE '${config.tz.replace(/[^A-Za-z_/]/g, '')}')::date`;
  const fecha = isoDate(qs.fecha, 'fecha'); const desde = isoDate(qs.desde, 'desde'); const hasta = isoDate(qs.hasta, 'hasta');
  if (fecha) add(`${local} = ?::date`, fecha);
  if (desde) add(`${local} >= ?::date`, desde);
  if (hasta) add(`${local} <= ?::date`, hasta);
  return { where: w.length ? `WHERE ${w.join(' AND ')}` : '', params: p };
}

const SELECT = `SELECT v.id, v.placa, p.nombre AS producto, v.espacio, v.horaentrada, v.horasalida, v.valorpagado, v.estado
                  FROM vehiculo v JOIN producto p ON p.id = v.producto_id`;

/** Listado + total de ingresos (equivale a listar_vehiculos + reportar_ingresos). */
router.get('/', wrap(async (req, res) => {
  const { where, params } = filtros(req.query);
  const { rows } = await query(`${SELECT} ${where} ORDER BY v.horaentrada DESC LIMIT 1000`, params);
  const tot = await query(`SELECT COALESCE(SUM(v.valorpagado),0) AS total FROM vehiculo v ${where}`, params);
  res.json({ items: rows, total: tot.rows[0].total });
}));

router.get('/export.xlsx', wrap(async (req, res) => {
  const { where, params } = filtros(req.query);
  const { rows } = await query(`${SELECT} ${where} ORDER BY v.horaentrada DESC`, params);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Vehículos');
  ws.columns = [
    { header: 'Placa', key: 'placa', width: 12 }, { header: 'Producto', key: 'producto', width: 18 },
    { header: 'Espacio', key: 'espacio', width: 10 }, { header: 'Hora entrada', key: 'horaentrada', width: 22 },
    { header: 'Hora salida', key: 'horasalida', width: 22 }, { header: 'Pago (S/.)', key: 'valorpagado', width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="vehiculos.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}));

async function cargar(id) {
  const { rows } = await query(
    `SELECT v.*, p.nombre AS producto_nombre, p.tarifa, p.horas, p.sobreestadia, p.tolerancia
       FROM vehiculo v JOIN producto p ON p.id = v.producto_id WHERE v.id = $1`, [id]);
  if (!rows[0]) throw notFound('Vehículo no encontrado');
  return rows[0];
}

const pdf = (res, buf, name) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${name}"`);
  res.send(buf);
};

router.get('/:id/ticket-entrada', wrap(async (req, res) => {
  const v = await cargar(int(req.params.id, 'id'));
  const est = await getParametros();
  pdf(res, await ticketEntrada({ est, vehiculo: v, producto: { nombre: v.producto_nombre, tarifa: v.tarifa, horas: v.horas } }),
    `ingreso-${v.placa}.pdf`);
}));

router.get('/:id/ticket-salida', wrap(async (req, res) => {
  const v = await cargar(int(req.params.id, 'id'));
  if (v.estado !== 'fuera') throw notFound('El vehículo aún no ha salido');
  const est = await getParametros();
  const cobro = calcularCobro({ entrada: v.horaentrada, salida: v.horasalida, ...v });
  const desglose = desglosarIgv(v.valorpagado, est.igv);
  pdf(res, await ticketSalida({ est, vehiculo: v, producto: { nombre: v.producto_nombre }, cobro, desglose }), `salida-${v.placa}.pdf`);
}));

module.exports = router;
