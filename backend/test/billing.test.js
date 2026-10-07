const test = require('node:test');
const assert = require('node:assert');
const { calcularCobro, desglosarIgv, vuelto } = require('../src/billing');

const base = { entrada: '2026-01-01T10:00:00Z', tarifa: 10, horas: 3, sobreestadia: 5, tolerancia: 0 };
const salidaTras = (h) => new Date(new Date(base.entrada).getTime() + h * 3600000).toISOString();

test('dentro del bloque se cobra la tarifa fija', () => {
  assert.strictEqual(calcularCobro({ ...base, salida: salidaTras(0.1) }).valor, 10);
  assert.strictEqual(calcularCobro({ ...base, salida: salidaTras(2.5) }).valor, 10);
  assert.strictEqual(calcularCobro({ ...base, salida: salidaTras(3) }).valor, 10);
});

test('pasado el bloque se suma sobreestadia por hora o fracción', () => {
  assert.strictEqual(calcularCobro({ ...base, salida: salidaTras(3.1) }).valor, 15);
  assert.strictEqual(calcularCobro({ ...base, salida: salidaTras(4) }).valor, 15);
  assert.strictEqual(calcularCobro({ ...base, salida: salidaTras(5.5) }).valor, 25);
});

test('la tolerancia extiende el bloque (0.25 = 15 min)', () => {
  const t = { ...base, tolerancia: 0.25 };
  assert.strictEqual(calcularCobro({ ...t, salida: salidaTras(3.2) }).valor, 10);
  assert.strictEqual(calcularCobro({ ...t, salida: salidaTras(3.3) }).valor, 15);
});

test('IGV incluido en el precio', () => {
  const d = desglosarIgv(11.8, 18);
  assert.deepStrictEqual(d, { subtotal: 10, igv: 1.8, total: 11.8 });
});

test('vuelto', () => assert.strictEqual(vuelto(20, 15.5), 4.5));
