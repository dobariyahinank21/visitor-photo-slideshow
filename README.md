# Visitor Photo Slideshow

Visitors upload photos from their phones at `/upload`. A TV shows them as a live, full-screen slideshow at `/display`.

## Tech Stack
- Node.js 22.13 or newer (Node 22.5 to 22.12 also works with the `--experimental-sqlite` flag already set in the npm scripts)
- Express and multer (web server and file uploads)
- SQLite via built-in `node:sqlite` (database)
- Socket.io (live updates to the display)
- Plain HTML, CSS and JavaScript (frontend)
- `node:test` (automated tests)

## Setup and Run
1. Install Node.js and check the version with `node -v`.
2. Open a terminal in the project folder.
3. Install dependencies with `npm install`. An "Unsupported engine" warning on Node 22.12 is harmless.
4. Optional: copy `.env.example` to `.env` to change settings. The defaults work without it.
5. Start the server with `npm start`. Two lines starting with "Upload:" and "Display:" should print, and the terminal must stay open.
6. Open the upload page at http://localhost:3000/upload
7. Open the display page at http://localhost:3000/display and press `F` for fullscreen.
8. Run the tests with `npm test`.

## Settings (`.env`)
- `PORT`: server port (default 3000)
- `HOST`: network address to bind (default 0.0.0.0; use 127.0.0.1 for this computer only)
- `SLIDE_DURATION_MS`: time per slide (default 5000)
- `DB_PATH` and `UPLOAD_DIR`: where the database and photos are stored

## Notes
- If you get a `listen EACCES` error (common on Windows), the port is blocked. Set a different `PORT`, such as 8787, in `.env` or in PowerShell with `$env:PORT=8787`, then use that port in the URLs above.
- To use it from a phone, join the same Wi-Fi and open `http://<your-computer-IP>:<port>/upload`. Do not set `HOST` to 127.0.0.1 for this.
- If `/display` shows "Waiting for the first photos", hard-refresh the page with Ctrl+F5.
