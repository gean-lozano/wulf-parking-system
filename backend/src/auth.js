const jwt = require('jsonwebtoken');
const config = require('./config');
const { HttpError } = require('./errors');

const sign = (user) =>
  jwt.sign({ id: user.id, usu: user.usu, rol: user.rol }, config.jwtSecret, { expiresIn: config.jwtExpires });

function requireAuth(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Inicia sesión para continuar'));
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new HttpError(401, 'Sesión vencida, vuelve a ingresar'));
  }
}

const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.rol) ? next() : next(new HttpError(403, 'No tienes permiso para esta acción'));

module.exports = { sign, requireAuth, requireRole };
