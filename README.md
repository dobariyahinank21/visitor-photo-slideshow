# Visitor Photo Slideshow

Visitors upload photos from their phones (`/upload`); a TV shows them as a live full-screen slideshow (`/display`).

## Tech stack
Node.js ≥ 22.13 · Express · multer · SQLite (built-in `node:sqlite`) · Socket.io · plain HTML/CSS/JS · `node:test`

## Setup
```bash
npm install
cp .env.example .env     # optional; defaults work
npm start
```
- Upload page: http://localhost:3000/upload
- Display page: http://localhost:3000/display (press `F` for fullscreen)

## Tests
```bash
npm test
```
Covers upload validation, returning-visitor lookup (and consent timestamp / rollback), and queue ordering.

## Layout
```
src/        config, names (normalization), validation, db, repository, app (routes), server (Socket.io)
public/     upload.html, display.html, js/queue.js (shared with tests), css
tests/      validation, repository, queue
```
See `ASSUMPTIONS.md` and `ARCHITECTURE.md` for design decisions, and `AI_LOG.md` for the AI-assistance log.
