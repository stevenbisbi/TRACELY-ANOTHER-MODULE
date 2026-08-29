const { sequelize, Usuario, Estudiante, Docente } = require('../../models');
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { normalizeId } = require('../../utils/normalizeId');
const { sendPasswordResetEmail } = require('../../services/emailService');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const rolMap = { admin: 'admin', docente: 'teacher', estudiante: 'student' };

const userController = {

  // Crea el Usuario y, según el rol, su perfil enlazado (Estudiante/Docente)
  // en una sola transacción — sin esto, un estudiante creado desde el admin
  // quedaba sin fila en `estudiante` y no podía inscribirse ni ver su
  // dashboard, pensum, etc. (todo eso hace join sobre Estudiante).
  registerUser: async (req, res) => {
    try {
      const { nombre, correo, password, rol, carrera_id, semestre_actual } = req.body;
      const id_institucional = normalizeId(req.body.id_institucional);
      const rolFinal = rol || 'estudiante';

      if (rolFinal === 'estudiante' && !carrera_id)
        return res.status(400).json({ error: 'carrera_id es requerido para crear un estudiante' });

      const contrasena_hash = await bcrypt.hash(password, 10);

      const newUser = await sequelize.transaction(async (t) => {
        const user = await Usuario.create({ id_institucional, nombre, correo, contrasena_hash, rol: rolFinal }, { transaction: t });
        if (rolFinal === 'estudiante') {
          await Estudiante.create({ usuario_id: id_institucional, carrera_id, semestre_actual: semestre_actual || 1 }, { transaction: t });
        } else if (rolFinal === 'docente') {
          await Docente.create({ usuario_id: id_institucional }, { transaction: t });
        }
        return user;
      });

      res.status(201).json({ message: 'Usuario registrado', user: { id_institucional: newUser.id_institucional, nombre: newUser.nombre, correo: newUser.correo, rol: newUser.rol } });
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError')
        return res.status(400).json({ error: 'El correo o ID ya está registrado' });
      if (e.name === 'SequelizeForeignKeyConstraintError')
        return res.status(400).json({ error: 'La carrera indicada no existe' });
      console.error(e);
      res.status(500).json({ error: 'Error al registrar el usuario' });
    }
  },

  loginUser: async (req, res) => {
    try {
      const { password } = req.body;
      const id = normalizeId(req.body.id);
      if (!id || !password) return res.status(400).json({ error: 'ID y contraseña son requeridos' });

      const user = await Usuario.scope('withPassword').findOne({ where: { id_institucional: id } });
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const valid = await bcrypt.compare(password, user.contrasena_hash);
      if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

      const token = jwt.sign(
        { id: user.id_institucional, rol: user.rol },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        user: {
          id_institucional: user.id_institucional,
          nombre:           user.nombre,
          correo:           user.correo,
          rol:              user.rol,
          role:             rolMap[user.rol] ?? user.rol,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el login' });
    }
  },

  // POST /api/users/forgot-password — { correo }
  // Siempre responde 200 con el mismo mensaje genérico, exista o no el
  // correo, para no filtrar qué correos están registrados en el sistema.
  forgotPassword: async (req, res) => {
    try {
      const { correo } = req.body;
      const generic = { message: 'Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.' };
      if (!correo) return res.json(generic);

      const user = await Usuario.findOne({ where: { correo } });
      if (!user) return res.json(generic);

      const rawToken = crypto.randomBytes(32).toString('hex');
      await user.update({
        reset_token: hashToken(rawToken),
        reset_token_expira: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
      sendPasswordResetEmail({ name: user.nombre, email: user.correo, resetUrl })
        .catch((e) => console.error('Error enviando email de reset:', e.message));

      res.json(generic);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
  },

  // POST /api/users/reset-password — { token, password }
  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ error: 'Token y contraseña son requeridos' });
      if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

      const user = await Usuario.scope('withPassword').findOne({
        where: { reset_token: hashToken(token), reset_token_expira: { [Op.gt]: new Date() } },
      });
      if (!user) return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });

      const contrasena_hash = await bcrypt.hash(password, 10);
      await user.update({ contrasena_hash, reset_token: null, reset_token_expira: null });

      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await Usuario.findOne({ where: { id_institucional: req.user.id } });
      if (!user) return res.status(404).json({ error: 'No encontrado' });
      res.json({ id_institucional: user.id_institucional, nombre: user.nombre, correo: user.correo, rol: user.rol, role: rolMap[user.rol] ?? user.rol });
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const { rol, search } = req.query;
      const where = {};
      if (rol) where.rol = rol;
      if (search) {
        where[Op.or] = [
          { nombre: { [Op.iLike]: `%${search}%` } },
          { correo: { [Op.iLike]: `%${search}%` } },
          { id_institucional: { [Op.iLike]: `%${search}%` } },
        ];
      }
      const data = await Usuario.findAll({ where });
      res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error al obtener usuarios' }); }
  },

  getOneUser: async (req, res) => {
    try {
      if (req.user.rol !== 'admin' && req.user.id !== req.params.id)
        return res.status(403).json({ error: 'No autorizado' });
      const data = await Usuario.findOne({ where: { id_institucional: req.params.id } });
      if (!data) return res.status(404).json({ error: 'No encontrado' });
      res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
  },

  // Admin puede además fijar una contraseña nueva (opcional) — reutiliza el
  // mismo patrón de hash que registerUser/resetPassword.
  updateUser: async (req, res) => {
    try {
      if (req.user.rol !== 'admin' && req.user.id !== req.params.id)
        return res.status(403).json({ error: 'No autorizado' });
      const user = await Usuario.findOne({ where: { id_institucional: req.params.id } });
      if (!user) return res.status(404).json({ error: 'No encontrado' });

      const cambios = { nombre: req.body.nombre, correo: req.body.correo };
      if (req.body.password) {
        if (req.body.password.length < 6)
          return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        cambios.contrasena_hash = await bcrypt.hash(req.body.password, 10);
      }

      await user.update(cambios);
      // No devolver `user` directamente: al setear contrasena_hash en
      // `cambios`, Sequelize lo deja en la instancia en memoria y se
      // filtraría en la respuesta pese a que el defaultScope lo excluye
      // en las consultas normales.
      res.json({
        message: 'Actualizado',
        user: { id_institucional: user.id_institucional, nombre: user.nombre, correo: user.correo, rol: user.rol },
      });
    } catch (error) { res.status(500).json({ error: 'Error al actualizar' }); }
  },

  // Un admin no puede eliminar su propia cuenta — evita que se quede sin
  // forma de administrar el sistema por accidente.
  deleteUser: async (req, res) => {
    try {
      if (req.user.id === req.params.id)
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      const deleted = await Usuario.destroy({ where: { id_institucional: req.params.id } });
      if (!deleted) return res.status(404).json({ error: 'No encontrado' });
      res.json({ message: 'Eliminado' });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
  },
};

module.exports = userController;