// src/utils/normalizeId.js
// Normaliza un ID institucional eliminando ceros a la izquierda, para que
// "000407850" y "407850" se traten como el mismo usuario. Los IDs que no son
// puramente numéricos (ej. "DOC001", "ADMIN001") se dejan intactos — ahí los
// ceros son parte del código, no un artefacto de relleno.
function normalizeId(id) {
  if (typeof id !== 'string') return id;
  const trimmed = id.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  const sinCeros = trimmed.replace(/^0+(?=\d)/, '');
  return sinCeros;
}

module.exports = { normalizeId };
