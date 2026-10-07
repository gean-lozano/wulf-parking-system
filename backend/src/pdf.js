const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');
const config = require('./config');

const A6 = [297.64, 419.53];
const fmtFecha = (d) =>
  new Intl.DateTimeFormat('es-PE', { timeZone: config.tz, dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' }).format(new Date(d));
const money = (n) => Number(n).toFixed(2);

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

const center = (doc, text, font = 'Helvetica', size = 11) =>
  doc.font(font).fontSize(size).text(text, { align: 'center' });

function cabecera(doc, titulo, est) {
  center(doc, titulo, 'Courier', 12);
  center(doc, est.razon, 'Helvetica-Bold', 12);
  if (est.ruc) center(doc, `ruc: ${est.ruc}`);
  center(doc, est.direccion);
  if (est.celular) center(doc, `celular: ${est.celular}`);
}

async function barcode(doc, texto) {
  const png = await bwipjs.toBuffer({ bcid: 'code39', text: texto, scale: 3, height: 12, includetext: true, textxalign: 'center' });
  const w = 200;
  doc.moveDown(0.5).image(png, (doc.page.width - w) / 2, doc.y, { width: w });
}

/** Ticket de ingreso (equivale a ticket_entrada). */
async function ticketEntrada({ est, vehiculo, producto }) {
  const doc = new PDFDocument({ size: A6, margin: 24 });
  const done = collect(doc);
  cabecera(doc, 'Ticket de ingreso', est);
  doc.moveDown();
  center(doc, producto.nombre, 'Helvetica', 15);
  center(doc, vehiculo.placa, 'Helvetica-Bold', 28);
  if (vehiculo.espacio) center(doc, `Espacio # ${vehiculo.espacio}`);
  center(doc, `Hora de entrada: ${fmtFecha(vehiculo.horaentrada)}`);
  center(doc, `Tarifa S/. ${money(producto.tarifa)} por ${producto.horas} horas`);
  if (est.comentario) center(doc, est.comentario, 'Helvetica', 9);
  await barcode(doc, vehiculo.placa);
  doc.end();
  return done;
}

/** Ticket/factura de salida (equivale a factura()). */
async function ticketSalida({ est, vehiculo, producto, cobro, desglose }) {
  const doc = new PDFDocument({ size: A6, margin: 24 });
  const done = collect(doc);
  cabecera(doc, 'Factura', est);
  const linea = () => center(doc, '-'.repeat(38), 'Courier', 9);
  linea();
  doc.font('Courier').fontSize(10);
  doc.text(`Producto: ${producto.nombre}`);
  doc.text(`Placa: ${vehiculo.placa}`);
  if (vehiculo.espacio) doc.text(`Espacio: ${vehiculo.espacio}`);
  doc.text(`Hora de entrada: ${fmtFecha(vehiculo.horaentrada)}`);
  doc.text(`Hora de salida: ${fmtFecha(vehiculo.horasalida)}`);
  doc.text(`Num de horas: ${money(cobro.horasDentro)}`);
  linea();
  center(doc, `Subtotal: ${money(desglose.subtotal)}`, 'Courier', 10);
  center(doc, `IGV ${est.igv}%: ${money(desglose.igv)}`, 'Courier', 10);
  center(doc, `Total: S/. ${money(desglose.total)}`, 'Courier-Bold', 11);
  linea();
  if (est.comentario) center(doc, est.comentario, 'Helvetica', 8);
  await barcode(doc, vehiculo.placa);
  doc.end();
  return done;
}

module.exports = { ticketEntrada, ticketSalida };
