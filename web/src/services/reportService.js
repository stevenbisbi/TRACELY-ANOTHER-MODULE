// services/reportService.js
// Descarga de reportes exportables (RF-21, RF-31). Los endpoints requieren
// Authorization header, así que no se puede navegar directo a la URL — se
// pide el archivo con fetch, se arma un blob y se dispara la descarga.
import { getToken } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function downloadBlob(url, filename) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al generar el reporte');
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

// GET /api/students/:id/report.pdf
export const downloadStudentReport = (estudianteId, studentName) =>
  downloadBlob(`${API}/students/${estudianteId}/report.pdf`, `reporte_${studentName || estudianteId}.pdf`);

// GET /api/teachers/:docenteId/report/:asignaturaId?format=pdf|xlsx
export const downloadGroupReport = (docenteId, asignaturaId, format, subjectName) =>
  downloadBlob(
    `${API}/teachers/${docenteId}/report/${asignaturaId}?format=${format}`,
    `reporte_grupo_${subjectName || asignaturaId}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`
  );
