// services/socketService.js
// Conexión de Socket.IO para notificaciones en tiempo real del estudiante
// (alertas de nota/asistencia que cruzan el umbral). Puramente aditivo: si
// el socket no conecta, la app sigue funcionando igual vía REST — el socket
// nunca es requisito para nada.
import { io } from 'socket.io-client';
import { getToken } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = API.replace(/\/api\/?$/, '');

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token: getToken() },
    reconnection: true,
    reconnectionDelay: 2000,
  });
  return socket;
}

export function onAlertaNueva(callback) {
  connectSocket().on('alerta:nueva', callback);
}

export function onAlertaResuelta(callback) {
  connectSocket().on('alerta:resuelta', callback);
}

// Resultado de una excusa de inasistencia (avalada o rechazada), sea por la
// Dirección o por verificación automática.
export function onExcusaResuelta(callback) {
  connectSocket().on('excusa:resuelta', callback);
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
