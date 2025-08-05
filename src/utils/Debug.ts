// src/utils/debug.ts
const DEBUG_MODE = process.env.NODE_ENV === 'development';

export const debugLog = {
  log: DEBUG_MODE ? console.log : () => {},
  error: console.error, // Always keep errors
  warn: console.warn,   // Always keep warnings
  info: DEBUG_MODE ? console.info : () => {},

};