const { bad } = require('./errors');

const str = (v, name, { max, min = 1, optional = false } = {}) => {
  if (v === undefined || v === null || String(v).trim() === '') {
    if (optional) return '';
    throw bad(`Falta el campo "${name}"`);
  }
  const s = String(v).trim();
  if (s.length < min) throw bad(`"${name}" es muy corto`);
  if (max && s.length > max) throw bad(`"${name}" admite máximo ${max} caracteres`);
  return s;
};

const num = (v, name, { min = -Infinity, max = Infinity } = {}) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  if (v === '' || v === null || v === undefined || !Number.isFinite(n)) throw bad(`"${name}" debe ser un número`);
  if (n < min || n > max) throw bad(`"${name}" debe estar entre ${min} y ${max}`);
  return n;
};

const int = (v, name, opts = {}) => {
  const n = num(v, name, opts);
  if (!Number.isInteger(n)) throw bad(`"${name}" debe ser un número entero`);
  return n;
};

const digits = (v, name, len) => {
  const s = str(v, name, { max: len });
  if (!/^\d+$/.test(s)) throw bad(`"${name}" solo admite números`);
  return s;
};

/** Placa: mayúsculas, letras/números/guion, máx. 8 (igual que el original). */
const placa = (v) => {
  const p = str(v, 'placa', { max: 8, min: 3 }).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(p)) throw bad('La placa solo admite letras, números y guion');
  return p;
};

const isoDate = (v, name) => {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw bad(`"${name}" debe tener formato AAAA-MM-DD`);
  return String(v);
};

module.exports = { str, num, int, digits, placa, isoDate };
