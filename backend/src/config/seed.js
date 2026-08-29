require('dotenv').config();
const bcrypt = require('bcrypt');
const {
  sequelize, Usuario, Carrera, Semestre, Estudiante, Docente,
  Pensum, Asignatura, Corte, Actividad, Inscripcion,
  Calificacion, Asistencia, Alerta,
} = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD');
    await sequelize.sync({ force: true });
    console.log('✅ Tablas recreadas');

    const hash = (p) => bcrypt.hash(p, 10);

    // ── Semestres ─────────────────────────────────────────────
    const [sem2025_1, sem2024_2, sem2024_1] = await Semestre.bulkCreate([
      { codigo: '2025-1', nombre: 'Primer Semestre 2025',   fecha_inicio: '2025-02-01', fecha_fin: '2025-06-30', activo: true  },
      { codigo: '2024-2', nombre: 'Segundo Semestre 2024',  fecha_inicio: '2024-08-01', fecha_fin: '2024-12-15', activo: false },
      { codigo: '2024-1', nombre: 'Primer Semestre 2024',   fecha_inicio: '2024-02-01', fecha_fin: '2024-06-30', activo: false },
    ]);
    console.log('✅ Semestres creados');

    // ── Usuarios ──────────────────────────────────────────────
    await Usuario.bulkCreate([
      { id_institucional: 'ADM-001',   nombre: 'Admin UNICATÓLICA',   correo: 'admin@unicatolica.edu.co',           contrasena_hash: await hash('admin123'), rol: 'admin'      },
      { id_institucional: 'DOC-0112',  nombre: 'Dr. Carlos Ramírez',  correo: 'c.ramirez@unicatolica.edu.co',       contrasena_hash: await hash('prof123'),  rol: 'docente'     },
      { id_institucional: 'DOC-0087',  nombre: 'Mg. Laura Ospina',    correo: 'l.ospina@unicatolica.edu.co',        contrasena_hash: await hash('prof123'),  rol: 'docente'     },
      { id_institucional: '2021-0342', nombre: 'Michael Sanchez',     correo: 'michael.sanchez@unicatolica.edu.co', contrasena_hash: await hash('est123'),   rol: 'estudiante'  },
      { id_institucional: '2021-0199', nombre: 'Valentina Torres',    correo: 'v.torres@unicatolica.edu.co',        contrasena_hash: await hash('est123'),   rol: 'estudiante'  },
      { id_institucional: '2022-0411', nombre: 'Andrés Mejía',        correo: 'a.mejia@unicatolica.edu.co',         contrasena_hash: await hash('est123'),   rol: 'estudiante'  },
    ]);
    console.log('✅ Usuarios creados');

    // ── Carreras ──────────────────────────────────────────────
    const [sistemas, admin_emp] = await Carrera.bulkCreate([
      { nombre: 'Tecnología en Desarrollo de Software', codigo: 'TDS', total_creditos: 120 },
      { nombre: 'Administración de Empresas',           codigo: 'ADM', total_creditos: 150 },
    ]);
    console.log('✅ Carreras creadas');

    // ── Docentes y estudiantes ────────────────────────────────
    const [doc1, doc2] = await Docente.bulkCreate([
      { usuario_id: 'DOC-0112' },
      { usuario_id: 'DOC-0087' },
    ]);
    const [est1, est2, est3] = await Estudiante.bulkCreate([
      { usuario_id: '2021-0342', carrera_id: sistemas.id, semestre_actual: 6 },
      { usuario_id: '2021-0199', carrera_id: sistemas.id, semestre_actual: 6 },
      { usuario_id: '2022-0411', carrera_id: sistemas.id, semestre_actual: 4 },
    ]);
    console.log('✅ Perfiles creados');

    // ── Pensum ────────────────────────────────────────────────
    const colores = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED'];
    const [p_bd2, p_redes, p_ing_sw, p_so, p_est] = await Pensum.bulkCreate([
      { carrera_id: sistemas.id, nombre_asignatura: 'Bases de Datos II',       semestre: 6, creditos: 4 },
      { carrera_id: sistemas.id, nombre_asignatura: 'Redes de Computadores',   semestre: 6, creditos: 3 },
      { carrera_id: sistemas.id, nombre_asignatura: 'Ingeniería de Software',  semestre: 6, creditos: 4 },
      { carrera_id: sistemas.id, nombre_asignatura: 'Sistemas Operativos',     semestre: 6, creditos: 3 },
      { carrera_id: sistemas.id, nombre_asignatura: 'Estadística Aplicada',    semestre: 6, creditos: 3 },
    ]);
    console.log('✅ Pensum creado');

    // ── Asignaturas 2025-1 ────────────────────────────────────
    const [a_bd2, a_redes, a_ing_sw, a_so, a_est] = await Asignatura.bulkCreate([
      { docente_id: doc1.id, pensum_id: p_bd2.id,   nombre: 'Bases de Datos II',      NRC: 'IS401-G1-2025-1', semestre_academico: '2025-1' },
      { docente_id: doc2.id, pensum_id: p_redes.id, nombre: 'Redes de Computadores',  NRC: 'IS410-G1-2025-1', semestre_academico: '2025-1' },
      { docente_id: doc2.id, pensum_id: p_ing_sw.id,nombre: 'Ingeniería de Software', NRC: 'IS420-G1-2025-1', semestre_academico: '2025-1' },
      { docente_id: doc1.id, pensum_id: p_so.id,    nombre: 'Sistemas Operativos',    NRC: 'IS405-G1-2025-1', semestre_academico: '2025-1' },
      { docente_id: doc2.id, pensum_id: p_est.id,   nombre: 'Estadística Aplicada',   NRC: 'MAT311-G1-2025-1',semestre_academico: '2025-1' },
    ]);
    console.log('✅ Asignaturas creadas');

    // ── Cortes para cada asignatura ───────────────────────────
    const crearCortes = async (asig_id) => {
      const [c1, c2, c3] = await Corte.bulkCreate([
        { asignatura_id: asig_id, numero_corte: 1, peso_porcentual: 30 },
        { asignatura_id: asig_id, numero_corte: 2, peso_porcentual: 30 },
        { asignatura_id: asig_id, numero_corte: 3, peso_porcentual: 40 },
      ]);
      return [c1, c2, c3];
    };

    const cortes_bd2   = await crearCortes(a_bd2.id);
    const cortes_redes = await crearCortes(a_redes.id);
    const cortes_sw    = await crearCortes(a_ing_sw.id);
    const cortes_so    = await crearCortes(a_so.id);
    const cortes_est   = await crearCortes(a_est.id);

    // ── Actividades para BD II ────────────────────────────────
    const [act_bd2_c1_t, act_bd2_c1_q, act_bd2_c1_p,
           act_bd2_c2_t, act_bd2_c2_q, act_bd2_c2_p,
           act_bd2_c3_pf, act_bd2_c3_ef] = await Actividad.bulkCreate([
      { corte_id: cortes_bd2[0].id, nombre: 'Taller ER',       tipo: 'taller',   porcentaje_en_corte: 30 },
      { corte_id: cortes_bd2[0].id, nombre: 'Quiz 1',          tipo: 'quiz',     porcentaje_en_corte: 30 },
      { corte_id: cortes_bd2[0].id, nombre: 'Parcial C1',      tipo: 'parcial',  porcentaje_en_corte: 40 },
      { corte_id: cortes_bd2[1].id, nombre: 'Taller SQL',      tipo: 'taller',   porcentaje_en_corte: 30 },
      { corte_id: cortes_bd2[1].id, nombre: 'Quiz 2',          tipo: 'quiz',     porcentaje_en_corte: 30 },
      { corte_id: cortes_bd2[1].id, nombre: 'Parcial C2',      tipo: 'parcial',  porcentaje_en_corte: 40 },
      { corte_id: cortes_bd2[2].id, nombre: 'Proyecto Final',  tipo: 'proyecto', porcentaje_en_corte: 60 },
      { corte_id: cortes_bd2[2].id, nombre: 'Examen Final',    tipo: 'parcial',  porcentaje_en_corte: 40 },
    ]);

    // Actividades para Redes
    const [act_r_c1_lab, act_r_c1_q, act_r_c1_p,
           act_r_c2_t,   act_r_c2_p,
           act_r_c3_pf] = await Actividad.bulkCreate([
      { corte_id: cortes_redes[0].id, nombre: 'Lab Packet Tracer', tipo: 'laboratorio', porcentaje_en_corte: 30 },
      { corte_id: cortes_redes[0].id, nombre: 'Quiz OSI',          tipo: 'quiz',        porcentaje_en_corte: 30 },
      { corte_id: cortes_redes[0].id, nombre: 'Parcial C1',        tipo: 'parcial',     porcentaje_en_corte: 40 },
      { corte_id: cortes_redes[1].id, nombre: 'Taller Enrutamiento',tipo: 'taller',     porcentaje_en_corte: 40 },
      { corte_id: cortes_redes[1].id, nombre: 'Parcial C2',        tipo: 'parcial',     porcentaje_en_corte: 60 },
      { corte_id: cortes_redes[2].id, nombre: 'Proyecto de Red',   tipo: 'proyecto',    porcentaje_en_corte: 100 },
    ]);

    // Actividades para Ing. Software
    const [act_sw_c1_uc, act_sw_c1_q, act_sw_c1_p,
           act_sw_c2_sp, act_sw_c2_p,
           act_sw_c3_sf] = await Actividad.bulkCreate([
      { corte_id: cortes_sw[0].id, nombre: 'Casos de Uso', tipo: 'taller',  porcentaje_en_corte: 30 },
      { corte_id: cortes_sw[0].id, nombre: 'Quiz UML',     tipo: 'quiz',    porcentaje_en_corte: 30 },
      { corte_id: cortes_sw[0].id, nombre: 'Parcial C1',   tipo: 'parcial', porcentaje_en_corte: 40 },
      { corte_id: cortes_sw[1].id, nombre: 'Sprint 1',     tipo: 'proyecto',porcentaje_en_corte: 50 },
      { corte_id: cortes_sw[1].id, nombre: 'Parcial C2',   tipo: 'parcial', porcentaje_en_corte: 50 },
      { corte_id: cortes_sw[2].id, nombre: 'Sprint Final', tipo: 'proyecto',porcentaje_en_corte: 100 },
    ]);

    // Actividades Sistemas Operativos y Estadística (corte 1 y 2 completos, 3 pendiente)
    const [act_so_c1_t, act_so_c1_q, act_so_c1_p, act_so_c2_lab, act_so_c2_p, act_so_c3_pf] = await Actividad.bulkCreate([
      { corte_id: cortes_so[0].id, nombre: 'Taller Procesos', tipo: 'taller',       porcentaje_en_corte: 30 },
      { corte_id: cortes_so[0].id, nombre: 'Quiz Memoria',    tipo: 'quiz',         porcentaje_en_corte: 30 },
      { corte_id: cortes_so[0].id, nombre: 'Parcial C1',      tipo: 'parcial',      porcentaje_en_corte: 40 },
      { corte_id: cortes_so[1].id, nombre: 'Lab Shell',       tipo: 'laboratorio',  porcentaje_en_corte: 40 },
      { corte_id: cortes_so[1].id, nombre: 'Parcial C2',      tipo: 'parcial',      porcentaje_en_corte: 60 },
      { corte_id: cortes_so[2].id, nombre: 'Proyecto SO',     tipo: 'proyecto',     porcentaje_en_corte: 100 },
    ]);
    const [act_est_c1_t, act_est_c1_p, act_est_c2_t, act_est_c2_p, act_est_c3_pf] = await Actividad.bulkCreate([
      { corte_id: cortes_est[0].id, nombre: 'Taller Probabilidad', tipo: 'taller',  porcentaje_en_corte: 40 },
      { corte_id: cortes_est[0].id, nombre: 'Parcial C1',          tipo: 'parcial', porcentaje_en_corte: 60 },
      { corte_id: cortes_est[1].id, nombre: 'Taller Regresión',    tipo: 'taller',  porcentaje_en_corte: 40 },
      { corte_id: cortes_est[1].id, nombre: 'Parcial C2',          tipo: 'parcial', porcentaje_en_corte: 60 },
      { corte_id: cortes_est[2].id, nombre: 'Proyecto Estadístico',tipo: 'proyecto',porcentaje_en_corte: 100 },
    ]);
    console.log('✅ Actividades creadas');

    // ── Inscripciones de Michael (est1) en 2025-1 ─────────────
    const [insc_bd2, insc_redes, insc_sw, insc_so, insc_est] = await Inscripcion.bulkCreate([
      { estudiante_id: est1.id, asignatura_id: a_bd2.id,   estado: 'activa' },
      { estudiante_id: est1.id, asignatura_id: a_redes.id, estado: 'activa' },
      { estudiante_id: est1.id, asignatura_id: a_ing_sw.id,estado: 'activa' },
      { estudiante_id: est1.id, asignatura_id: a_so.id,    estado: 'activa' },
      { estudiante_id: est1.id, asignatura_id: a_est.id,   estado: 'activa' },
    ]);
    // Valentina y Andrés solo en BD II
    await Inscripcion.bulkCreate([
      { estudiante_id: est2.id, asignatura_id: a_bd2.id, estado: 'activa' },
      { estudiante_id: est3.id, asignatura_id: a_bd2.id, estado: 'activa' },
    ]);
    console.log('✅ Inscripciones creadas');

    // ── Calificaciones de Michael ─────────────────────────────
    await Calificacion.bulkCreate([
      // BD II - Corte 1 y 2 completados, Corte 3 pendiente
      { inscripcion_id: insc_bd2.id, actividad_id: act_bd2_c1_t.id, nota: 4.5, fecha_registro: new Date('2025-03-10') },
      { inscripcion_id: insc_bd2.id, actividad_id: act_bd2_c1_q.id, nota: 3.8, fecha_registro: new Date('2025-03-15') },
      { inscripcion_id: insc_bd2.id, actividad_id: act_bd2_c1_p.id, nota: 4.2, fecha_registro: new Date('2025-03-25') },
      { inscripcion_id: insc_bd2.id, actividad_id: act_bd2_c2_t.id, nota: 4.0, fecha_registro: new Date('2025-04-20') },
      { inscripcion_id: insc_bd2.id, actividad_id: act_bd2_c2_q.id, nota: 4.3, fecha_registro: new Date('2025-04-25') },
      { inscripcion_id: insc_bd2.id, actividad_id: act_bd2_c2_p.id, nota: 4.1, fecha_registro: new Date('2025-05-05') },

      // Redes - Corte 1 completo, Corte 2 y 3 pendientes
      { inscripcion_id: insc_redes.id, actividad_id: act_r_c1_lab.id, nota: 3.5, fecha_registro: new Date('2025-03-12') },
      { inscripcion_id: insc_redes.id, actividad_id: act_r_c1_q.id,   nota: 3.2, fecha_registro: new Date('2025-03-18') },
      { inscripcion_id: insc_redes.id, actividad_id: act_r_c1_p.id,   nota: 3.7, fecha_registro: new Date('2025-03-28') },

      // Ing. Software - Corte 1 y 2 completados
      { inscripcion_id: insc_sw.id, actividad_id: act_sw_c1_uc.id, nota: 4.8, fecha_registro: new Date('2025-03-08') },
      { inscripcion_id: insc_sw.id, actividad_id: act_sw_c1_q.id,  nota: 5.0, fecha_registro: new Date('2025-03-14') },
      { inscripcion_id: insc_sw.id, actividad_id: act_sw_c1_p.id,  nota: 4.6, fecha_registro: new Date('2025-03-24') },
      { inscripcion_id: insc_sw.id, actividad_id: act_sw_c2_sp.id, nota: 4.3, fecha_registro: new Date('2025-04-22') },
      { inscripcion_id: insc_sw.id, actividad_id: act_sw_c2_p.id,  nota: 4.2, fecha_registro: new Date('2025-05-03') },

      // Sistemas Operativos - Corte 1 completo (notas bajas - alerta)
      { inscripcion_id: insc_so.id, actividad_id: act_so_c1_t.id, nota: 3.0, fecha_registro: new Date('2025-03-11') },
      { inscripcion_id: insc_so.id, actividad_id: act_so_c1_q.id, nota: 2.8, fecha_registro: new Date('2025-03-17') },
      { inscripcion_id: insc_so.id, actividad_id: act_so_c1_p.id, nota: 3.1, fecha_registro: new Date('2025-03-27') },
      { inscripcion_id: insc_so.id, actividad_id: act_so_c2_lab.id,nota: 3.5,fecha_registro: new Date('2025-04-21') },
      { inscripcion_id: insc_so.id, actividad_id: act_so_c2_p.id,  nota: 3.6,fecha_registro: new Date('2025-05-04') },

      // Estadística - Corte 1 y 2 completados
      { inscripcion_id: insc_est.id, actividad_id: act_est_c1_t.id, nota: 4.2, fecha_registro: new Date('2025-03-09') },
      { inscripcion_id: insc_est.id, actividad_id: act_est_c1_p.id, nota: 4.3, fecha_registro: new Date('2025-03-26') },
      { inscripcion_id: insc_est.id, actividad_id: act_est_c2_t.id, nota: 3.9, fecha_registro: new Date('2025-04-23') },
      { inscripcion_id: insc_est.id, actividad_id: act_est_c2_p.id, nota: 4.0, fecha_registro: new Date('2025-05-06') },
    ]);
    console.log('✅ Calificaciones creadas');

    // ── Asistencia de Michael (fechas simuladas) ───────────────
    const fechasClase = [
      '2025-02-10','2025-02-17','2025-02-24',
      '2025-03-03','2025-03-10','2025-03-17','2025-03-24','2025-03-31',
      '2025-04-07','2025-04-14','2025-04-28',
      '2025-05-05','2025-05-12','2025-05-19','2025-05-26',
    ];

    // BD II: 92% asistencia (14/15 presentes)
    for (let i = 0; i < fechasClase.length; i++) {
      await Asistencia.create({ inscripcion_id: insc_bd2.id, fecha: fechasClase[i], presente: i !== 5, registrado_por: 'DOC-0112' });
    }
    // Redes: 78% asistencia (crítica - genera alerta)
    const presentesRedes = [1,1,0,1,1,0,1,0,1,1,0,1,1,0,1];
    for (let i = 0; i < fechasClase.length; i++) {
      await Asistencia.create({ inscripcion_id: insc_redes.id, fecha: fechasClase[i], presente: !!presentesRedes[i], registrado_por: 'DOC-0087' });
    }
    // Ing. Software: 95% (14/15)
    for (let i = 0; i < fechasClase.length; i++) {
      await Asistencia.create({ inscripcion_id: insc_sw.id, fecha: fechasClase[i], presente: i !== 10, registrado_por: 'DOC-0087' });
    }
    // Sistemas Operativos: 72% (muy crítica)
    const presentesSO = [1,0,1,1,0,1,0,0,1,1,0,1,0,1,1];
    for (let i = 0; i < fechasClase.length; i++) {
      await Asistencia.create({ inscripcion_id: insc_so.id, fecha: fechasClase[i], presente: !!presentesSO[i], registrado_por: 'DOC-0112' });
    }
    // Estadística: 88% (13/15)
    for (let i = 0; i < fechasClase.length; i++) {
      await Asistencia.create({ inscripcion_id: insc_est.id, fecha: fechasClase[i], presente: i !== 3 && i !== 8, registrado_por: 'DOC-0087' });
    }
    console.log('✅ Asistencia creada');

    // ── Alertas de asistencia crítica ─────────────────────────
    await Alerta.bulkCreate([
      { inscripcion_id: insc_redes.id, tipo: 'advertencia', estado: 'activa', nota_minima_requerida: null, es_recuperable: true },
      { inscripcion_id: insc_so.id,    tipo: 'critica',     estado: 'activa', nota_minima_requerida: 3.5,  es_recuperable: true },
    ]);
    console.log('✅ Alertas creadas');

    console.log('\n🎉 Seed completado con datos realistas.');
    console.log('  Admin:      ADM-001    / admin123');
    console.log('  Docente:    DOC-0112   / prof123');
    console.log('  Estudiante: 2021-0342  / est123  (Michael - 5 materias con notas y asistencia)');
    console.log('\n  Datos para la sustentación:');
    console.log('  - BD II: notas corte 1 y 2 completas, asistencia 92%');
    console.log('  - Redes: corte 1 completo, asistencia 78% ⚠ ALERTA');
    console.log('  - Ing. Software: corte 1 y 2 completos, asistencia 95%');
    console.log('  - Sistemas Op.: notas bajas, asistencia 72% 🚨 CRÍTICO');
    console.log('  - Estadística: corte 1 y 2 completos, asistencia 88%');

  } catch (err) {
    console.error('❌ Error en seed:', err);
  } finally {
    await sequelize.close();
  }
}

seed();
