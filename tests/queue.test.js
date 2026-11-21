'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const PlaybackQueue = require('../public/js/queue');

const p = (id, who = 'x') => ({ id, url: `/uploads/${id}.jpg`, visitorName: who });
const drain = (q, n) => Array.from({ length: n }, () => q.next().photo.id);

test('FIFO: batches play in the order they were enqueued', () => {
  const q = new PlaybackQueue();
  q.enqueue([p(1), p(2)]);   // visitor A finishes first
  q.enqueue([p(3), p(4)]);   // visitor B finishes while A is still playing
  assert.deepEqual(drain(q, 4), [1, 2, 3, 4]);
});

test('a new batch never interrupts or jumps ahead of the current queue', () => {
  const q = new PlaybackQueue();
  q.enqueue([p(1), p(2), p(3)]);
  assert.equal(q.next().photo.id, 1);  // slide 1 is "on screen"
  q.enqueue([p(9)]);                   // arrives mid-slide
  assert.deepEqual(drain(q, 3), [2, 3, 9]);
});

test('returning visitor batch (new + previous) keeps its order and drops duplicates', () => {
  const q = new PlaybackQueue();
  q.enqueue([p(10), p(11), p(10), p(5), p(6)]);
  assert.deepEqual(drain(q, 4), [10, 11, 5, 6]);
});

test('idle loop cycles the archive in order and wraps around', () => {
  const q = new PlaybackQueue();
  q.setArchive([p(1), p(2), p(3)]);
  const out = Array.from({ length: 5 }, () => q.next());
  assert.deepEqual(out.map((o) => o.photo.id), [1, 2, 3, 1, 2]);
  assert.ok(out.every((o) => o.source === 'idle'));
});

test('queued photos take priority over idle loop, then idle resumes', () => {
  const q = new PlaybackQueue();
  q.setArchive([p(1), p(2)]);
  q.enqueue([p(7)]);
  const a = q.next(), b = q.next();
  assert.equal(a.source, 'queue'); assert.equal(a.photo.id, 7);
  assert.equal(b.source, 'idle');
});

test('empty queue and empty archive returns null', () => {
  assert.equal(new PlaybackQueue().next(), null);
});
