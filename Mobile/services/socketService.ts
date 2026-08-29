// Conexión de Socket.IO para notificaciones en tiempo real del estudiante
// (alertas de nota/asistencia que cruzan el umbral). Puramente aditivo: si
// el socket no conecta, la app sigue funcionando igual vía REST — el socket
// nunca es requisito para nada. Mismo patrón que web/src/services/socketService.js,
// adaptado a que getToken() aquí es async (SecureStore).
import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from './client';

const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

export interface AlertaPayload {
  asignaturaId: string;
  asignaturaNombre: string;
  tipo?: 'advertencia' | 'critica';
  categoria: 'nota' | 'asistencia';
  notaProyectada?: number | null;
  notaMinimaRequerida?: number | null;
  recuperable?: boolean;
}

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket) return socket;
  const token = await getToken();
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
  });
  return socket;
}

export async function onAlertaNueva(callback: (payload: AlertaPayload) => void) {
  const s = await connectSocket();
  s.on('alerta:nueva', callback);
}

export async function onAlertaResuelta(callback: (payload: AlertaPayload) => void) {
  const s = await connectSocket();
  s.on('alerta:resuelta', callback);
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
