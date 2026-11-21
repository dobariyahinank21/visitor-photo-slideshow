'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const config = require('./config');
const { validateSubmission } = require('./validation');

/**
 * Build the Express app. Dependencies are injected (repo, io, dirs) so it is easy to test.
 * `io` is optional; when present, finished uploads are broadcast to /display screens.
 */
function createApp({ repo, io = null, uploadDir = config.uploadDir }) {
  const app = express();
  fs.mkdirSync(uploadDir, { recursive: true });

  // Memory storage: nothing touches disk until the whole batch has passed validation.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.limits.maxFileBytes, files: config.limits.maxFilesPerBatch },
  });

  const pub = path.join(__dirname, '..', 'public');
  app.use('/uploads', express.static(uploadDir, { setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }));
  app.use(express.static(pub));
  app.get('/', (_req, res) => res.redirect('/upload'));
  app.get('/upload', (_req, res) => res.sendFile(path.join(pub, 'upload.html')));
  app.get('/display', (_req, res) => res.sendFile(path.join(pub, 'display.html')));

  // The browser reads limits from here so client and server rules cannot drift apart.
  app.get('/api/config', (_req, res) =>
    res.json({ ...config.limits, slideDurationMs: config.slideDurationMs }));
  app.get('/api/photos', (_req, res) => res.json(repo.listAllPhotos()));

  app.post('/api/upload', upload.array('photos', config.limits.maxFilesPerBatch + 1), (req, res) => {
    const body = req.body || {}; // req.body is undefined for non-multipart requests
    const result = validateSubmission({ name: body.name, consent: body.consent, files: req.files });
    if (!result.ok) return res.status(400).json({ errors: result.errors });

    // Write validated files with random names (never trust the client's filename).
    const stored = result.files.map((f) => ({
      filename: `${crypto.randomUUID()}${f.ext}`, mime: f.mime, size: f.size, buffer: f.buffer,
    }));
    for (const s of stored) fs.writeFileSync(path.join(uploadDir, s.filename), s.buffer, { flag: 'wx' });

    let saved;
    try {
      saved = repo.recordUpload({ name: result.name, files: stored });
    } catch (err) {
      for (const s of stored) fs.rmSync(path.join(uploadDir, s.filename), { force: true });
      throw err;
    }

    // New photos first, then the visitor's earlier ones; one batch keeps them together in the FIFO.
    const batch = [...saved.newPhotos, ...saved.previousPhotos];
    if (io) io.to('displays').emit('photos:queued', { visitorName: result.name, photos: batch });
    res.status(201).json({ isReturning: saved.isReturning, uploaded: saved.newPhotos.length, queued: batch.length });
  });

  // Turn multer limit errors and unexpected failures into clean JSON.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ errors: [`Upload rejected: ${err.message}`] });
    console.error(err);
    res.status(500).json({ errors: ['Something went wrong. Please try again.'] });
  });
  return app;
}

module.exports = { createApp };
