// src/services/socketService.js
// Singleton simple para la instancia de Socket.IO. Se inicializa una vez en
// app.js al arrancar el servidor y se usa desde otros servicios/controllers
// (alertService, attendanceController) para emitir eventos a un estudiante
// específico, sin tener que pasar `io` a través de toda la cadena de
// llamadas.
let io = null;

function init(ioInstance) {
  io = ioInstance;
}

// Emite un evento a todas las conexiones activas de un estudiante (puede
// tener varias pestañas/dispositivos abiertos a la vez).
function emitToStudent(usuarioId, event, payload) {
  if (!io || !usuarioId) return;
  io.to(`student:${usuarioId}`).emit(event, payload);
}

module.exports = { init, emitToStudent };
