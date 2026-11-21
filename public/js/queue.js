/**
 * PlaybackQueue: FIFO queue of fresh photos with an idle-loop fallback over the archive.
 * UMD so the exact same code runs in the browser (/display) and in Node tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlaybackQueue = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  class PlaybackQueue {
    constructor() {
      this.fifo = [];     // photos waiting to be shown, oldest first
      this.archive = [];  // every known photo, used to loop when the FIFO is empty
      this.cursor = 0;    // position in the idle loop
      this.knownIds = new Set();
    }

    /** Replace the archive (e.g. initial load from /api/photos). */
    setArchive(photos) {
      this.archive = [...photos];
      this.knownIds = new Set(photos.map((p) => p.id));
      this.cursor = 0;
    }

    /**
     * Append a batch to the END of the FIFO so concurrent uploads play in arrival order.
     * Duplicate ids inside the batch are dropped (a batch = new photos + previous photos).
     * The batch is never allowed to jump ahead of, or interrupt, what is already queued.
     */
    enqueue(photos) {
      const seen = new Set();
      for (const p of photos) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        this.fifo.push(p);
        if (!this.knownIds.has(p.id)) {
          this.knownIds.add(p.id);
          this.archive.push(p); // brand-new photos join the idle loop
        }
      }
    }

    /** Next photo to show: FIFO first, then idle loop; null if nothing exists yet. */
    next() {
      if (this.fifo.length > 0) return { photo: this.fifo.shift(), source: 'queue' };
      if (this.archive.length === 0) return null;
      const photo = this.archive[this.cursor % this.archive.length];
      this.cursor = (this.cursor + 1) % this.archive.length;
      return { photo, source: 'idle' };
    }

    get pending() { return this.fifo.length; }
  }
  return PlaybackQueue;
});
