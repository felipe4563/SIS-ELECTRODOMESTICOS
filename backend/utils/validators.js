const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE  = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const isValidEmail    = str => EMAIL_RE.test(String(str ?? '').trim());
const isValidDate     = str => DATE_RE.test(String(str ?? '').trim());
const isNumericId     = str => /^\d+$/.test(String(str)) && Number(str) > 0;

/**
 * Devuelve null si la contraseña es válida, o un string con el mensaje de error.
 * Requisitos: mínimo 8 caracteres, al menos 1 mayúscula y 1 dígito.
 */
const validatePassword = str => {
  if (!str || typeof str !== 'string') return 'La contraseña es requerida';
  if (str.length < 8)      return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(str))  return 'La contraseña debe incluir al menos una letra mayúscula';
  if (!/[0-9]/.test(str))  return 'La contraseña debe incluir al menos un número';
  return null;
};

module.exports = { isValidEmail, isValidDate, isNumericId, validatePassword };
