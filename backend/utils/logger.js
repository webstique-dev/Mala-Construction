/**
 * Minimal structured logger. Kept dependency-free for now.
 * Swap for winston/pino later if log aggregation is needed - the call sites won't change.
 */
const levels = ['error', 'warn', 'info', 'debug'];

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) {
    out(line, meta);
  } else {
    out(line);
  }
}

const logger = {};
for (const level of levels) {
  logger[level] = (message, meta) => log(level, message, meta);
}

module.exports = logger;
