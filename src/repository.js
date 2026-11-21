'use strict';
const { normalizeName, cleanDisplayName } = require('./names');

/** Data-access layer. All SQL lives here so routes and tests stay simple. */
function createRepository(db) {
  const findVisitor = db.prepare('SELECT * FROM visitors WHERE normalized_name = ?');
  const insertVisitor = db.prepare('INSERT INTO visitors (display_name, normalized_name, created_at) VALUES (?, ?, ?)');
  const updateVisitorName = db.prepare('UPDATE visitors SET display_name = ? WHERE id = ?');
  const insertUpload = db.prepare('INSERT INTO uploads (visitor_id, consent_at, created_at) VALUES (?, ?, ?)');
  const insertPhoto = db.prepare(
    'INSERT INTO photos (visitor_id, upload_id, filename, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const photosByVisitor = db.prepare(
    `SELECT p.id, p.filename, v.display_name AS visitor_name FROM photos p
     JOIN visitors v ON v.id = p.visitor_id WHERE p.visitor_id = ? ORDER BY p.id`
  );
  const allPhotos = db.prepare(
    `SELECT p.id, p.filename, v.display_name AS visitor_name FROM photos p
     JOIN visitors v ON v.id = p.visitor_id ORDER BY p.id`
  );

  const toPhoto = (r) => ({ id: r.id, url: `/uploads/${r.filename}`, visitorName: r.visitor_name });

  return {
    /** Case-insensitive, whitespace-insensitive lookup. */
    findVisitorByName(name) {
      return findVisitor.get(normalizeName(name)) ?? null;
    },

    /**
     * Atomically record a consented upload batch.
     * `files` = [{ filename, mime, size }] already written to disk.
     * Previous photos are read BEFORE inserting so they are cleanly separated from new ones.
     */
    recordUpload({ name, files, now = new Date() }) {
      const ts = now.toISOString();
      const display = cleanDisplayName(name);
      db.exec('BEGIN');
      try {
        let visitor = findVisitor.get(normalizeName(name));
        const isReturning = Boolean(visitor);
        let previous = [];
        if (visitor) {
          previous = photosByVisitor.all(visitor.id);
          updateVisitorName.run(display, visitor.id); // show their latest preferred spelling
        } else {
          const r = insertVisitor.run(display, normalizeName(name), ts);
          visitor = { id: Number(r.lastInsertRowid) };
        }
        const upload = insertUpload.run(visitor.id, ts, ts); // consent timestamp stored here
        const uploadId = Number(upload.lastInsertRowid);
        const added = files.map((f) => {
          const r = insertPhoto.run(visitor.id, uploadId, f.filename, f.mime, f.size, ts);
          return { id: Number(r.lastInsertRowid), filename: f.filename, visitor_name: display };
        });
        db.exec('COMMIT');
        const rename = (r) => toPhoto({ ...r, visitor_name: display });
        return { visitorId: visitor.id, isReturning, newPhotos: added.map(toPhoto), previousPhotos: previous.map(rename) };
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    listAllPhotos() {
      return allPhotos.all().map(toPhoto);
    },
  };
}

module.exports = { createRepository };
