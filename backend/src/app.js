const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { requireAuth, requireRole } = require('./auth');
const { HttpError } = require('./errors');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/parametros', requireAuth, require('./routes/parametros'));
app.use('/api/productos', requireAuth, require('./routes/productos'));
app.use('/api/estacionamiento', requireAuth, require('./routes/estacionamiento'));
app.use('/api/vehiculos', requireAuth, require('./routes/vehiculos'));
app.use('/api/usuarios', requireAuth, requireRole('admin'), require('./routes/usuarios'));

// En producción el mismo servidor entrega el frontend compilado (frontend/dist)
const dist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
