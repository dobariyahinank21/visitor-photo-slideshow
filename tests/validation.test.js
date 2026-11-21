'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSubmission } = require('../src/validation');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]);
const file = (over = {}) => ({ originalname: 'a.jpg', mimetype: 'image/jpeg', size: 100, buffer: JPEG, ...over });
const base = (over = {}) => ({ name: 'Ana', consent: 'true', files: [file()], ...over });

test('accepts valid JPEG, PNG and WebP', () => {
  const r = validateSubmission(base({
    files: [file(), file({ mimetype: 'image/png', buffer: PNG }), file({ mimetype: 'image/webp', buffer: WEBP })],
  }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.files.map((f) => f.ext), ['.jpg', '.png', '.webp']);
});

test('rejects missing name and missing consent', () => {
  assert.equal(validateSubmission(base({ name: '   ' })).ok, false);
  assert.equal(validateSubmission(base({ consent: undefined })).ok, false);
  assert.equal(validateSubmission(base({ consent: 'false' })).ok, false);
});

test('rejects disallowed MIME types (gif, pdf)', () => {
  assert.equal(validateSubmission(base({ files: [file({ mimetype: 'image/gif' })] })).ok, false);
  assert.equal(validateSubmission(base({ files: [file({ mimetype: 'application/pdf' })] })).ok, false);
});

test('rejects files over 5 MB but accepts exactly 5 MB', () => {
  const MB5 = 5 * 1024 * 1024;
  assert.equal(validateSubmission(base({ files: [file({ size: MB5 + 1 })] })).ok, false);
  assert.equal(validateSubmission(base({ files: [file({ size: MB5 })] })).ok, true);
});

test('rejects more than 5 photos and zero photos', () => {
  assert.equal(validateSubmission(base({ files: Array.from({ length: 6 }, () => file()) })).ok, false);
  assert.equal(validateSubmission(base({ files: Array.from({ length: 5 }, () => file()) })).ok, true);
  assert.equal(validateSubmission(base({ files: [] })).ok, false);
});

test('rejects spoofed content (declared PNG, JPEG bytes)', () => {
  const r = validateSubmission(base({ files: [file({ mimetype: 'image/png', buffer: JPEG })] }));
  assert.equal(r.ok, false);
});
