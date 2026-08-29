// src/services/reportService.js
// Generación de reportes exportables (RF-21, RF-31): resumen académico
// individual de un estudiante (PDF) y resumen grupal de un curso (PDF/Excel).
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { calcularResumenCurso } = require('../utils/gradeMath');

function resumenInscripcion(insc) {
  const cortesBase = insc.asignatura?.cortes ?? [];
  const calPorActividad = Object.fromEntries((insc.calificaciones ?? []).map((c) => [c.actividad_id, c.nota]));
  const cortesParaCalculo = cortesBase.map((c) => ({
    peso_porcentual: c.peso_porcentual,
    actividades: (c.actividades ?? []).map((a) => ({ porcentaje_en_corte: a.porcentaje_en_corte, nota: calPorActividad[a.id] ?? null })),
  }));
  const resumen = calcularResumenCurso(cortesParaCalculo);
  const total = insc.asistencias?.length ?? 0;
  const presentes = insc.asistencias?.filter((a) => a.presente).length ?? 0;
  const asistencia = total > 0 ? Math.round((presentes / total) * 100) : 100;
  return { resumen, asistencia, alertasActivas: insc.alertas?.length ?? 0 };
}

const fmt = (n) => (n != null ? n.toFixed(2) : '—');

function streamStudentReportPdf(res, { estudiante, inscripciones }) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte_${estudiante.usuario.id_institucional}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor('#1C3992').text('Tracely — Reporte Académico Individual', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).fillColor('#000');
  doc.text(`Estudiante: ${estudiante.usuario.nombre}`);
  doc.text(`ID institucional: ${estudiante.usuario.id_institucional}`);
  doc.text(`Carrera: ${estudiante.carrera?.nombre ?? '—'}`);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`);
  doc.moveDown(1.5);

  if (inscripciones.length === 0) {
    doc.fontSize(11).fillColor('#666').text('El estudiante no tiene materias inscritas.');
  }

  inscripciones.forEach((insc) => {
    const { resumen, asistencia, alertasActivas } = resumenInscripcion(insc);

    doc.fontSize(13).fillColor('#1C3992').text(insc.asignatura?.nombre ?? 'Asignatura');
    doc.fontSize(10).fillColor('#333');
    doc.text(
      `Nota definitiva: ${fmt(resumen.nota_definitiva)}   ·   Recuperable: ${resumen.recuperable ? 'Sí' : 'No'}   ·   Nota mínima requerida: ${fmt(resumen.nota_minima_requerida)}`
    );
    doc.text(`Asistencia: ${asistencia}%   ·   Alertas activas: ${alertasActivas}`);
    resumen.cortes.forEach((c, i) => {
      doc.text(`  Corte ${i + 1} (${c.peso_porcentual}%): ${fmt(c.nota_corte)} ${c.completo ? '— completo' : '— pendiente'}`);
    });
    doc.moveDown();
  });

  doc.end();
}

function streamGroupReportPdf(res, { asignatura, filas }) {
  const doc = new PDFDocument({ margin: 50, layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte_grupo_${asignatura.NRC ?? asignatura.id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor('#1C3992').text('Tracely — Reporte Grupal', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor('#000').text(`${asignatura.nombre} (${asignatura.NRC ?? ''})`, { align: 'center' });
  doc.fontSize(10).fillColor('#666').text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });
  doc.moveDown(1.2);

  const promedio = filas.length
    ? filas.reduce((s, f) => s + (f.notaDefinitiva ?? 0), 0) / filas.length
    : null;
  const enRiesgo = filas.filter((f) => f.notaDefinitiva != null && f.notaDefinitiva < asignatura.umbral_advertencia).length;

  doc.fontSize(11).fillColor('#333');
  doc.text(`Promedio del grupo: ${fmt(promedio)}   ·   Estudiantes en riesgo: ${enRiesgo}/${filas.length}   ·   Umbral de advertencia: ${asignatura.umbral_advertencia}`);
  doc.moveDown();

  const colX = [50, 260, 340, 420, 500, 600, 700];
  const headerY = doc.y;
  doc.fontSize(9).fillColor('#fff');
  doc.rect(50, headerY, 700, 20).fill('#1C3992');
  doc.fillColor('#fff');
  doc.text('Estudiante', colX[0] + 4, headerY + 5);
  doc.text('ID', colX[1] + 4, headerY + 5);
  doc.text('Nota def.', colX[2] + 4, headerY + 5);
  doc.text('Nota mín.', colX[3] + 4, headerY + 5);
  doc.text('Recuperable', colX[4] + 4, headerY + 5);
  doc.text('Asistencia', colX[5] + 4, headerY + 5);
  doc.text('Alertas', colX[6] + 4, headerY + 5);

  let y = headerY + 20;
  filas.forEach((f, i) => {
    if (y > 500) { doc.addPage({ layout: 'landscape' }); y = 50; }
    doc.rect(50, y, 700, 18).fill(i % 2 === 0 ? '#F4F5FB' : '#FFFFFF');
    doc.fillColor('#1E1B3A').fontSize(9);
    doc.text(f.name, colX[0] + 4, y + 4, { width: 200 });
    doc.text(f.id_inst, colX[1] + 4, y + 4);
    doc.text(fmt(f.notaDefinitiva), colX[2] + 4, y + 4);
    doc.text(fmt(f.notaMinimaRequerida), colX[3] + 4, y + 4);
    doc.text(f.recuperable ? 'Sí' : 'No', colX[4] + 4, y + 4);
    doc.text(`${f.asistencia}%`, colX[5] + 4, y + 4);
    doc.text(String(f.alertasActivas), colX[6] + 4, y + 4);
    y += 18;
  });

  doc.end();
}

function buildGroupReportExcel({ asignatura, filas }) {
  const rows = filas.map((f) => ({
    Estudiante: f.name,
    ID: f.id_inst,
    'Nota definitiva': f.notaDefinitiva,
    'Nota mínima requerida': f.notaMinimaRequerida,
    Recuperable: f.recuperable ? 'Sí' : 'No',
    'Asistencia %': f.asistencia,
    'Alertas activas': f.alertasActivas,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, asignatura.nombre.slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { resumenInscripcion, streamStudentReportPdf, streamGroupReportPdf, buildGroupReportExcel };
