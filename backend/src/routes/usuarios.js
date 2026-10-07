const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { wrap, bad, conflict, notFound } = require('../errors');
const { str, int } = require('../validators');

router.get('/', wrap(async (_req, res) => {
  res.json((await query('SELECT id, usu, rol FROM usuario ORDER BY id')).rows);
}));

router.post('/', wrap(async (req, res) => {
  const usu = str(req.body.usu, 'usuario', { max: 20, min: 3 });
  const contra = str(req.body.contra, 'contraseña', { min: 6, max: 72 });
  const rol = req.body.rol;
  if (!['admin', 'cajero'].includes(rol)) throw bad('El rol debe ser admin o cajero');
  try {
    const hash = await bcrypt.hash(contra, 10);
    const { rows } = await query('INSERT INTO usuario (usu, contra, rol) VALUES ($1,$2,$3) RETURNING id, usu, rol', [usu, hash, rol]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') throw conflict('Ese usuario ya existe');
    throw e;
  }
}));

router.put('/:id/password', wrap(async (req, res) => {
  const id = int(req.params.id, 'id');
  const contra = str(req.body.contra, 'contraseña', { min: 6, max: 72 });
  const { rowCount } = await query('UPDATE usuario SET contra=$1 WHERE id=$2', [await bcrypt.hash(contra, 10), id]);
  if (!rowCount) throw notFound('Usuario no encontrado');
  res.status(204).end();
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = int(req.params.id, 'id');
  if (id === req.user.id) throw bad('No puedes eliminar tu propio usuario');
  const { rowCount } = await query('DELETE FROM usuario WHERE id=$1', [id]);
  if (!rowCount) throw notFound('Usuario no encontrado');
  res.status(204).end();
}));

module.exports = router;
