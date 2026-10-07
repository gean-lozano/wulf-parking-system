const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { sign, requireAuth } = require('../auth');
const { HttpError, wrap } = require('../errors');
const { str } = require('../validators');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera unos minutos' } });

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const usu = str(req.body.usu, 'usuario', { max: 20 });
  const contra = str(req.body.contra, 'contraseña', { max: 100 });
  const { rows } = await query('SELECT id, usu, contra, rol FROM usuario WHERE usu = $1', [usu]);
  const user = rows[0];
  // mismo mensaje para usuario inexistente o clave incorrecta (no revela cuál falló)
  if (!user || !(await bcrypt.compare(contra, user.contra))) throw new HttpError(401, 'Usuario o contraseña incorrectos');
  res.json({ token: sign(user), user: { id: user.id, usu: user.usu, rol: user.rol } });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
