// src/config/swagger.js
const swaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Tracely API',
    version: '1.0.0',
    description: 'API REST del Sistema de Seguimiento Académico Tracely — UNICATÓLICA',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Desarrollo local' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id:     { type: 'integer' },
          nombre: { type: 'string' },
          email:  { type: 'string' },
          rol:    { type: 'string', enum: ['admin', 'profesor', 'estudiante'] },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['id', 'password'],
        properties: {
          id:       { type: 'string', example: '1' },
          password: { type: 'string', example: 'mi_contraseña' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user:  { $ref: '#/components/schemas/User' },
        },
      },
      Grade: {
        type: 'object',
        properties: {
          id:            { type: 'integer' },
          estudiante_id: { type: 'integer' },
          curso_id:      { type: 'integer' },
          corte:         { type: 'integer', enum: [1, 2, 3] },
          actividad:     { type: 'string' },
          tipo:          { type: 'string' },
          valor:         { type: 'number', minimum: 0, maximum: 5 },
        },
      },
      AttendanceRecord: {
        type: 'object',
        properties: {
          estudiante_id: { type: 'integer' },
          curso_id:      { type: 'integer' },
          fecha:         { type: 'string', format: 'date' },
          presente:      { type: 'boolean' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/status': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        security: [],
        responses: { 200: { description: 'API funcionando' } },
      },
    },
    '/api/users/register': {
      post: {
        tags: ['Usuarios'],
        summary: 'Registrar nuevo usuario',
        security: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'email', 'password'],
                properties: {
                  nombre:     { type: 'string', example: 'Juan Pérez' },
                  email:      { type: 'string', example: 'juan@unicatolica.edu.co' },
                  password:   { type: 'string', example: 'Contraseña123' },
                  rol:        { type: 'string', enum: ['admin', 'profesor', 'estudiante'], default: 'estudiante' },
                  carrera_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usuario creado' },
          400: { description: 'Email ya registrado' },
        },
      },
    },
    '/api/users/login': {
      post: {
        tags: ['Usuarios'],
        summary: 'Iniciar sesión',
        security: [],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Login exitoso', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          401: { description: 'Contraseña incorrecta' },
          404: { description: 'Usuario no encontrado' },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Usuarios'],
        summary: 'Perfil del usuario autenticado',
        responses: { 200: { description: 'Perfil del usuario' } },
      },
    },
    '/api/grades/student/{studentId}': {
      get: {
        tags: ['Notas'],
        summary: 'Notas del estudiante por semestre',
        parameters: [
          { in: 'path', name: 'studentId', required: true, schema: { type: 'integer' } },
          { in: 'query', name: 'semestre', schema: { type: 'string', example: '2025-1' } },
        ],
        responses: { 200: { description: 'Notas agrupadas por curso y corte' } },
      },
    },
    '/api/grades': {
      post: {
        tags: ['Notas'],
        summary: 'Registrar o actualizar una nota (Profesor/Admin)',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Grade' },
            },
          },
        },
        responses: { 200: { description: 'Nota guardada' } },
      },
    },
    '/api/grades/bulk': {
      post: {
        tags: ['Notas'],
        summary: 'Subir notas en lote (Profesor/Admin)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  grades: { type: 'array', items: { $ref: '#/components/schemas/Grade' } },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Notas procesadas' } },
      },
    },
    '/api/attendance/student/{studentId}': {
      get: {
        tags: ['Asistencia'],
        summary: 'Asistencia del estudiante',
        parameters: [
          { in: 'path', name: 'studentId', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Asistencia por curso con porcentaje' } },
      },
    },
    '/api/attendance/bulk': {
      post: {
        tags: ['Asistencia'],
        summary: 'Guardar asistencia del día para un grupo (Profesor)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['curso_id', 'fecha', 'records'],
                properties: {
                  curso_id: { type: 'integer' },
                  fecha:    { type: 'string', format: 'date', example: '2025-07-01' },
                  records:  { type: 'array', items: { $ref: '#/components/schemas/AttendanceRecord' } },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Asistencia guardada' } },
      },
    },
  },
};

module.exports = swaggerDoc;
