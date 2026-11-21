# Assumptions

| Gap in the brief | Decision | Rationale |
|---|---|---|
| **Visitor matching** | Names are matched after Unicode NFKC, trim, whitespace-collapse and lowercase. Stored as `normalized_name` (UNIQUE). | Meets "case-insensitive"; also tolerates stray spaces and accent encoding differences. Two different people with the same name are indistinguishable, which is an accepted limitation (no login). |
| **Display name** | Shows the spelling from the visitor's latest upload. | Lets people fix typos. |
| **Consent** | Checkbox is unchecked by default; the server rejects anything but an explicit `true`/`on`. A consent timestamp (UTC ISO-8601) is stored per upload batch in `uploads.consent_at`. | Consent is recorded per submission, so there is evidence for each batch. Earlier photos of a returning visitor are replayed on the assumption that the earlier consent still applies; no withdrawal/deletion flow was requested, so none is built. |
| **File limits** | JPEG/PNG/WebP, 5 MB each, 5 per batch. Checked in the browser (limits fetched from `/api/config`) and on the server (MIME type, size, count, plus magic-byte sniffing). | Client checks are only UX; server is the authority. The MIME header can be spoofed, so content is verified. Exactly 5 MB is accepted. |
| **Batch atomicity** | Any invalid file rejects the whole batch. DB writes are one transaction; files are saved under random UUID names and removed if the DB write fails. | Avoids half-uploaded batches. Original filenames are never used. |
| **Returning visitors** | On upload, previous photos are read before the new ones are inserted. One batch is queued: new photos first, then previous photos. | Satisfies "queue new and previous together"; new ones appear first. |
| **Queue concurrency** | The server broadcasts a finished batch; each display appends it to the END of an in-memory FIFO. Nothing interrupts the current slide. Duplicate ids within a batch are dropped. | Ordering is by upload completion. Node is single-threaded, so completions are naturally serialized. |
| **Multiple displays** | Each display keeps its own queue and may drift by a slide or two. | Simplicity; displays are expected to be one screen. |
| **Idle loop** | When the FIFO is empty, the display cycles through all stored photos oldest-to-newest, wrapping around. New photos join the loop. The first load pulls the archive from `/api/photos`. | Matches "loop older photos when idle". A display that reconnects merges missed photos into the loop. |
| **Slide timing** | 5 s starting once the image has loaded; broken images are skipped. Configurable via `SLIDE_DURATION_MS`. | Prevents a slow image from showing for less than 5 s. |
| **Persistence of queue** | The pending FIFO is not persisted; a display reload restarts in idle loop. | Keeps the system simple; photos are never lost since they live in SQLite. |
| **Security** | No authentication, no rate limiting. Names are rendered via `textContent`. Uploads served with `nosniff`. | Intended for a trusted event network; add auth/rate limits for public deployment. |
| **Storage** | Images on local disk (`UPLOAD_DIR`), metadata in SQLite. | Fits a single-venue deployment. |
