# Architecture

## Stack justification
- **Express + multer**: minimal, well-known HTTP and multipart handling.
- **SQLite (`node:sqlite`)**: single-file database, zero services to run, ships with Node 22, so no native build step. Plenty for a venue-scale photo list.
- **Socket.io**: pushes finished uploads to displays instantly, with automatic reconnect.
- **Plain HTML/JS**: two small pages need no build step. `public/js/queue.js` is a UMD module shared by the browser and the tests.

## SQLite schema
```sql
visitors(id PK, display_name, normalized_name UNIQUE, created_at)
uploads (id PK, visitor_id FK→visitors, consent_at, created_at)   -- one row per submitted batch
photos  (id PK, visitor_id FK→visitors, upload_id FK→uploads,
         filename UNIQUE, mime_type, size_bytes, created_at)
```

## System flow
```mermaid
flowchart TD
  A[Visitor phone /upload] -->|name, photos, consent| B[Client validation]
  B -->|POST /api/upload| C[Express + multer memory storage]
  C --> D{Server validation: name, consent, count, size, MIME, magic bytes}
  D -->|invalid| E[400 JSON errors]
  D -->|valid| F[Write files with UUID names]
  F --> G[(SQLite transaction)]
  G -->|find visitor by normalized name, read previous photos, insert upload with consent_at and new photos| H[Batch = new + previous]
  H --> I[Socket.io emit photos:queued to displays room]
  I --> J[TV /display]
  J --> K[Append to FIFO queue]
  K --> L{FIFO empty?}
  L -->|no| M[Show next queued photo 5s]
  L -->|yes| N[Idle loop over archive from /api/photos]
  M --> L
  N --> L
```
