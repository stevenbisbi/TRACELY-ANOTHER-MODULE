const jwt = require('jsonwebtoken');

/**
 * Middleware que verifica el token JWT en el header Authorization.
 * Agrega req.user = { id, rol } si el token es válido.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token)
    return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = decoded; // { id, rol, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware de autorización por rol.
 * Uso: authorize('admin') o authorize('admin', 'profesor')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ error: 'No autenticado' });

  if (!roles.includes(req.user.rol))
    return res.status(403).json({ error: 'No tienes permiso para esta acción' });

  next();
};

module.exports = { authenticate, authorize };
