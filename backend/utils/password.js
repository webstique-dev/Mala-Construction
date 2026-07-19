const crypto = require('crypto');

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O - avoids visual ambiguity
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function randomChar(charset) {
  return charset[crypto.randomInt(charset.length)];
}

/** Generates a random password guaranteed to satisfy the app's password policy. */
function generateTempPassword(length = 12) {
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SYMBOLS)];
  const rest = Array.from({ length: length - required.length }, () => randomChar(ALL));
  const chars = [...required, ...rest];

  // Fisher-Yates shuffle so the required chars aren't always in the same positions.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { generateTempPassword };
