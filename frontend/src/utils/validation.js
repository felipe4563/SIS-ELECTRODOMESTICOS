const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = str => EMAIL_RE.test(String(str ?? '').trim());

/**
 * Devuelve null si la contraseña es válida, o un string con el mensaje de error.
 * Mínimo 8 caracteres, al menos 1 mayúscula y 1 dígito.
 */
export const validatePassword = str => {
  if (!str || str.length < 8)     return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(str))         return 'Debe incluir al menos una mayúscula';
  if (!/[0-9]/.test(str))         return 'Debe incluir al menos un número';
  return null;
};
