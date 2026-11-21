'use strict';
// Central configuration. Everything comes from environment variables with safe defaults.
const path = require('node:path');

const MB = 1024 * 1024;

module.exports = {
  port: Number(process.env.PORT) || 3000,
  dbPath: path.resolve(process.env.DB_PATH || './data/slideshow.db'),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  slideDurationMs: Number(process.env.SLIDE_DURATION_MS) || 5000,
  // Upload limits: the single source of truth, served to the browser via /api/config.
  limits: {
    maxFileBytes: 5 * MB,
    maxFilesPerBatch: 5,
    maxNameLength: 80,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};
