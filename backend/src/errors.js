class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);
const notFound = (msg = 'No encontrado') => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

/** Envuelve handlers async para que los errores lleguen al middleware de errores. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, bad, notFound, conflict, wrap };
