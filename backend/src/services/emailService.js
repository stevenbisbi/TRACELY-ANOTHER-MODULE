// src/services/emailService.js
// Usando Resend (resend.com) — gratis hasta 3000 emails/mes

let resendClient = null;

function getResend() {
  if (resendClient) return resendClient;
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// El SDK de Resend NO rechaza la promesa cuando el envío falla por una razón
// de la API (ej. cuenta en modo sandbox sin dominio verificado, intentando
// enviar a un correo distinto al de la cuenta) — resuelve igual con
// { data: null, error: {...} }. Sin este chequeo, ese tipo de fallo queda
// invisible: el código de arriba asumía éxito con solo un try/catch.
function loggedSend(result, context) {
  if (result?.error) {
    console.error(`❌ Error email (${context}):`, result.error.message);
    return false;
  }
  console.log(`📧 Email enviado (${context})`);
  return true;
}

const emailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',sans-serif;background:#f4f5fb;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1C3992,#2C4FB8);padding:32px 40px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:white;letter-spacing:-0.5px;">Tracely</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Sistema de Seguimiento Académico — UNICATÓLICA</div>
    </div>
    ${content}
    <div style="background:#f4f5fb;padding:16px 40px;text-align:center;border-top:1px solid #EEF0FA;">
      <div style="font-size:11px;color:#A8A5C0;">Mensaje automático de Tracely. No responder.</div>
    </div>
  </div>
</body>
</html>`;

const sendAttendanceAlert = async ({ studentName, studentEmail, subjectName, attendancePercent, isRecuperable }) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  RESEND_API_KEY no configurado — email omitido');
    return false;
  }
  const color  = attendancePercent < 70 ? '#DC2626' : '#D97706';
  const tipo   = attendancePercent < 70 ? 'CRÍTICA' : 'BAJA';
  const msg    = attendancePercent < 70
    ? 'Tu asistencia está en nivel crítico. Comunícate urgentemente con coordinación académica.'
    : 'Tu asistencia está por debajo del mínimo requerido (80%). No faltes más clases.';

  const html = emailTemplate(`
    <div style="padding:32px 40px;">
      <div style="background:${color}15;border-left:4px solid ${color};padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px;">⚠ Asistencia ${tipo}</div>
        <div style="font-size:24px;font-weight:700;color:${color};margin-top:4px;">${attendancePercent}%</div>
      </div>
      <p style="font-size:16px;color:#1E1B3A;margin:0 0 8px;">Hola, <strong>${studentName}</strong></p>
      <p style="font-size:14px;color:#6B6888;line-height:1.6;margin:0 0 20px;">${msg}</p>
      <div style="background:#f4f5fb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#A8A5C0;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Asignatura</div>
        <div style="font-size:16px;font-weight:600;color:#1E1B3A;">${subjectName}</div>
        <div style="font-size:13px;color:#6B6888;margin-top:4px;">Actual: <strong style="color:${color}">${attendancePercent}%</strong> — Mínimo: <strong>80%</strong></div>
      </div>
      ${isRecuperable
        ? '<p style="font-size:13px;color:#059669;background:#f0fdf4;padding:10px 14px;border-radius:8px;margin:0 0 20px;">✓ Situación recuperable. Habla con tu docente.</p>'
        : '<p style="font-size:13px;color:#DC2626;background:#fef2f2;padding:10px 14px;border-radius:8px;margin:0 0 20px;">⛔ Situación crítica. Habla con coordinación académica.</p>'}
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/attendance" style="display:inline-block;background:#F59E0B;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Ver mi asistencia →</a>
    </div>`);

  try {
    const result = await getResend().emails.send({
      from:    process.env.EMAIL_FROM || 'Tracely <onboarding@resend.dev>',
      to:      studentEmail,
      subject: `⚠ Asistencia ${tipo.toLowerCase()} en ${subjectName} — ${attendancePercent}%`,
      html,
    });
    return loggedSend(result, `asistencia → ${studentEmail}`);
  } catch (err) {
    console.error('❌ Error email:', err.message);
    return false;
  }
};

const sendGradeNotification = async ({ studentName, studentEmail, subjectName, activityName, grade }) => {
  if (!process.env.RESEND_API_KEY) return false;
  const color = grade >= 3.0 ? '#059669' : '#DC2626';

  const html = emailTemplate(`
    <div style="padding:32px 40px;">
      <p style="font-size:16px;color:#1E1B3A;margin:0 0 20px;">Hola, <strong>${studentName}</strong></p>
      <div style="background:#f4f5fb;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
        <div style="font-size:12px;color:#A8A5C0;text-transform:uppercase;letter-spacing:0.8px;">${subjectName} — ${activityName}</div>
        <div style="font-size:48px;font-weight:700;color:${color};margin:8px 0;">${grade.toFixed(1)}</div>
        <div style="font-size:13px;color:#6B6888;">Escala 0.0 – 5.0</div>
      </div>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/grades" style="display:inline-block;background:#F59E0B;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Ver mis notas →</a>
    </div>`);

  try {
    const result = await getResend().emails.send({
      from:    process.env.EMAIL_FROM || 'Tracely <onboarding@resend.dev>',
      to:      studentEmail,
      subject: `📝 Nueva nota en ${subjectName}: ${grade.toFixed(1)}`,
      html,
    });
    return loggedSend(result, `nota → ${studentEmail}`);
  } catch (err) {
    console.error('❌ Error email nota:', err.message);
    return false;
  }
};

// RF-26 — notifica al DOCENTE (no al estudiante) cuando un estudiante suyo
// genera una alerta académica por nota (proyección baja o crítica).
const sendTeacherRiskAlert = async ({
  teacherName, teacherEmail, studentName, subjectName,
  notaDefinitiva, notaMinimaRequerida, recuperable, tipo,
}) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  RESEND_API_KEY no configurado — email omitido');
    return false;
  }
  const color = tipo === 'critica' ? '#DC2626' : '#D97706';
  const label = tipo === 'critica' ? 'CRÍTICA' : 'ADVERTENCIA';

  const html = emailTemplate(`
    <div style="padding:32px 40px;">
      <div style="background:${color}15;border-left:4px solid ${color};padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px;">Alerta académica ${label}</div>
        <div style="font-size:20px;font-weight:700;color:${color};margin-top:4px;">${studentName}</div>
      </div>
      <p style="font-size:16px;color:#1E1B3A;margin:0 0 8px;">Hola, <strong>${teacherName}</strong></p>
      <p style="font-size:14px;color:#6B6888;line-height:1.6;margin:0 0 20px;">
        Un estudiante de <strong>${subjectName}</strong> tiene una proyección de nota que activó una alerta automática.
      </p>
      <div style="background:#f4f5fb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#A8A5C0;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Nota definitiva actual</div>
        <div style="font-size:24px;font-weight:700;color:${color};">${notaDefinitiva != null ? notaDefinitiva.toFixed(2) : '—'}</div>
        ${notaMinimaRequerida != null ? `<div style="font-size:13px;color:#6B6888;margin-top:4px;">Necesita <strong>${notaMinimaRequerida.toFixed(2)}</strong> en lo pendiente para aprobar</div>` : ''}
      </div>
      ${recuperable
        ? '<p style="font-size:13px;color:#059669;background:#f0fdf4;padding:10px 14px;border-radius:8px;margin:0 0 20px;">✓ Todavía es matemáticamente recuperable.</p>'
        : '<p style="font-size:13px;color:#DC2626;background:#fef2f2;padding:10px 14px;border-radius:8px;margin:0 0 20px;">⛔ Ya no es matemáticamente recuperable.</p>'}
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/teacher/dashboard" style="display:inline-block;background:#F59E0B;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Ver mi dashboard →</a>
    </div>`);

  try {
    const result = await getResend().emails.send({
      from:    process.env.EMAIL_FROM || 'Tracely <onboarding@resend.dev>',
      to:      teacherEmail,
      subject: `Alerta ${label.toLowerCase()}: ${studentName} en ${subjectName}`,
      html,
    });
    return loggedSend(result, `alerta docente → ${teacherEmail}`);
  } catch (err) {
    console.error('❌ Error email docente:', err.message);
    return false;
  }
};

// RF-05 — enlace de restablecimiento de contraseña
const sendPasswordResetEmail = async ({ name, email, resetUrl }) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  RESEND_API_KEY no configurado — email omitido');
    return false;
  }

  const html = emailTemplate(`
    <div style="padding:32px 40px;">
      <p style="font-size:16px;color:#1E1B3A;margin:0 0 8px;">Hola, <strong>${name}</strong></p>
      <p style="font-size:14px;color:#6B6888;line-height:1.6;margin:0 0 20px;">
        Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, haz clic en el siguiente botón.
        Este enlace expira en 30 minutos.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#F59E0B;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">Restablecer contraseña →</a>
      <p style="font-size:12px;color:#A8A5C0;line-height:1.6;margin:20px 0 0;">
        Si no solicitaste esto, puedes ignorar este correo — tu contraseña actual seguirá siendo válida.
      </p>
    </div>`);

  try {
    const result = await getResend().emails.send({
      from:    process.env.EMAIL_FROM || 'Tracely <onboarding@resend.dev>',
      to:      email,
      subject: 'Restablece tu contraseña de Tracely',
      html,
    });
    return loggedSend(result, `reset password → ${email}`);
  } catch (err) {
    console.error('❌ Error email reset:', err.message);
    return false;
  }
};

module.exports = { sendAttendanceAlert, sendGradeNotification, sendTeacherRiskAlert, sendPasswordResetEmail };
