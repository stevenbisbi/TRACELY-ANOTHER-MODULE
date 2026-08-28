require('dotenv').config();

// Los 3 puntos donde se firma/verifica el JWT usan `process.env.JWT_SECRET ||
// 'secretkey'` como fallback de desarrollo. En producción, si la variable no
// quedó configurada, ese fallback público volvería los tokens falsificables
// sin que nada lo avise — se corta el arranque en vez de servir así.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET no está configurado — obligatorio en producción');
  process.exit(1);
}

const http      = require('http');
const jwt       = require('jsonwebtoken');
const express   = require('express');
const cors      = require('cors');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./config/swagger');
const { sequelize } = require('./models');
const socketService = require('./services/socketService');

// ── Routers ────────────────────────────────────────────────────
const userRouter         = require('./modules/users/userRouter');
const careerRouter       = require('./modules/careers/careerRouter');
const semesterRouter     = require('./modules/semesters/semesterRouter');
const studentRouter      = require('./modules/students/studentRouter');
const teacherRouter      = require('./modules/teachers/teacherRouter');
const pensumRouter       = require('./modules/pensum/pensumRouter');
const subjectRouter      = require('./modules/subjects/subjectRouter');
const corteRouter        = require('./modules/cortes/corteRouter');
const actividadRouter    = require('./modules/actividades/actividadRouter');
const inscripcionRouter  = require('./modules/inscripciones/inscripcionRouter');
const calificacionRouter = require('./modules/calificaciones/calificacionRouter');
const attendanceRouter   = require('./modules/attendance/attendanceRouter');
const alertaRouter       = require('./modules/alertas/alertaRouter');
const adminRouter        = require('./modules/admin/adminRouter');
const excusaRouter       = require('./modules/excusas/excusaRouter');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3000;

// ── Socket.IO: notificaciones de alertas en tiempo real ─────────
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true },
});

io.use((socket, next) => {
  try {
    const decoded = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET || 'secretkey');
    socket.user = decoded; // { id, rol }
    next();
  } catch {
    next(new Error('Token inválido o expirado'));
  }
});

io.on('connection', (socket) => {
  if (socket.user?.rol === 'estudiante') {
    socket.join(`student:${socket.user.id}`);
  }
});

socketService.init(io);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get('/api/status', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' })
);

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/users',          userRouter);
app.use('/api/careers',        careerRouter);
app.use('/api/semesters',      semesterRouter);
app.use('/api/students',       studentRouter);
app.use('/api/teachers',       teacherRouter);
app.use('/api/pensum',         pensumRouter);
app.use('/api/subjects',       subjectRouter);
app.use('/api/cortes',         corteRouter);
app.use('/api/actividades',    actividadRouter);
app.use('/api/inscripciones',  inscripcionRouter);
app.use('/api/calificaciones', calificacionRouter);
app.use('/api/attendance',     attendanceRouter);
app.use('/api/alertas',        alertaRouter);
app.use('/api/admin',          adminRouter);
app.use('/api/excusas',        excusaRouter);

app.use((req, res) =>
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` })
);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

sequelize.authenticate()
  .then(() => { console.log('✅ PostgreSQL conectado'); return sequelize.sync({ alter: false }); })
  .then(() => {
    console.log('✅ Modelos sincronizados');
    server.listen(PORT, () => {
      console.log(`🚀 http://localhost:${PORT}`);
      console.log(`📖 Swagger: http://localhost:${PORT}/api/docs`);
      console.log(`🔌 Socket.IO listo`);
    });
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });

module.exports = app;
