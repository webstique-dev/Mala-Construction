export function isEmail(value) {
  if (!value) return false;
  return /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(String(value).trim());
}

export function isStrongPassword(value) {
  if (!value) return false;
  // min 8 chars, at least one letter and one number
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(String(value));
}

export function trimString(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}

export function isUrl(value) {
  try {
    if (!value) return false;
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (e) {
    return false;
  }
}

export function isPostalCode(value) {
  if (!value) return false;
  return /^[A-Za-z0-9\- ]{3,10}$/.test(String(value).trim());
}

export function isNumericInRange(value, min = -Infinity, max = Infinity) {
  if (value === undefined || value === null || value === '') return false;
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  return n >= min && n <= max;
}
