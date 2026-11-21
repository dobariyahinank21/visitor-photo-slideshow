'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../src/db');
const { createRepository } = require('../src/repository');
const { normalizeName } = require('../src/names');

const f = (n) => ({ filename: `${n}.jpg`, mime: 'image/jpeg', size: 10 });

test('normalizeName is case, whitespace and unicode-form insensitive', () => {
  assert.equal(normalizeName('  Ana   MARÍA '), normalizeName('ana maría'));
  assert.equal(normalizeName('Jose\u0301'), normalizeName('José'));
});

test('first upload creates a visitor with no previous photos', () => {
  const repo = createRepository(openDatabase());
  const r = repo.recordUpload({ name: 'Sam', files: [f('s1')] });
  assert.equal(r.isReturning, false);
  assert.equal(r.previousPhotos.length, 0);
  assert.equal(r.newPhotos.length, 1);
});

test('returning visitor (different casing/spacing) gets earlier photos back', () => {
  const repo = createRepository(openDatabase());
  repo.recordUpload({ name: 'Sam Lee', files: [f('a'), f('b')] });
  const r = repo.recordUpload({ name: '  sam   LEE ', files: [f('c')] });
  assert.equal(r.isReturning, true);
  assert.deepEqual(r.previousPhotos.map((p) => p.url), ['/uploads/a.jpg', '/uploads/b.jpg']);
  assert.deepEqual(r.newPhotos.map((p) => p.url), ['/uploads/c.jpg']);
  assert.equal(r.newPhotos[0].visitorName, 'sam   LEE'.replace(/\s+/g, ' '));
  assert.equal(repo.listAllPhotos().length, 3);
});

test('different visitors are not mixed up', () => {
  const repo = createRepository(openDatabase());
  repo.recordUpload({ name: 'Ann', files: [f('x')] });
  const r = repo.recordUpload({ name: 'Bob', files: [f('y')] });
  assert.equal(r.isReturning, false);
  assert.equal(r.previousPhotos.length, 0);
});

test('consent timestamp is stored with every upload batch', () => {
  const db = openDatabase();
  const repo = createRepository(db);
  const now = new Date('2026-01-02T03:04:05.000Z');
  repo.recordUpload({ name: 'Zed', files: [f('z')], now });
  assert.equal(db.prepare('SELECT consent_at FROM uploads').get().consent_at, now.toISOString());
});

test('failed insert rolls back the whole batch', () => {
  const repo = createRepository(openDatabase());
  assert.throws(() => repo.recordUpload({ name: 'Dup', files: [f('same'), f('same')] }));
  assert.equal(repo.listAllPhotos().length, 0);
  assert.equal(repo.findVisitorByName('Dup'), null);
});
