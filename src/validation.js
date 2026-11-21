'use strict';
const { limits } = require('./config');
const { cleanDisplayName } = require('./names');

/** Detect the real image type from magic bytes (the client-sent MIME type can be spoofed). */
function sniffImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** Consent must be an explicit affirmative value; absence or anything else is refusal. */
function isConsentGiven(value) {
  return value === true || value === 'true' || value === 'on';
}

/**
 * Validate a whole submission. Files are { originalname, mimetype, size, buffer }.
 * Returns { ok, errors[], name, files: [{...file, mime, ext}] }.
 */
function validateSubmission({ name, consent, files }) {
  const errors = [];
  const cleanName = cleanDisplayName(name);

  if (!cleanName) errors.push('Name is required.');
  else if (cleanName.length > limits.maxNameLength) errors.push(`Name must be at most ${limits.maxNameLength} characters.`);

  if (!isConsentGiven(consent)) errors.push('You must consent to public display.');

  const list = Array.isArray(files) ? files : [];
  if (list.length === 0) errors.push('Please choose at least one photo.');
  if (list.length > limits.maxFilesPerBatch) errors.push(`At most ${limits.maxFilesPerBatch} photos per upload.`);

  const accepted = [];
  for (const f of list) {
    const label = f.originalname || 'file';
    if (!limits.allowedMimeTypes.includes(f.mimetype)) {
      errors.push(`${label}: only JPEG, PNG and WebP are allowed.`);
      continue;
    }
    if (f.size > limits.maxFileBytes) {
      errors.push(`${label}: larger than ${limits.maxFileBytes / (1024 * 1024)} MB.`);
      continue;
    }
    const real = sniffImageType(f.buffer);
    if (real !== f.mimetype) {
      errors.push(`${label}: content does not match a valid ${f.mimetype} image.`);
      continue;
    }
    accepted.push({ ...f, mime: real, ext: EXT[real] });
  }

  return { ok: errors.length === 0, errors, name: cleanName, files: accepted };
}

module.exports = { validateSubmission, sniffImageType, isConsentGiven };
