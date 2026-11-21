/* TV display: FIFO queue of new uploads, idle loop over older photos, 5 s per slide. */
(async function () {
  const stage = document.getElementById('stage');
  const caption = document.getElementById('caption');
  const empty = document.getElementById('empty');
  const queue = new PlaybackQueue();
  const cfg = await (await fetch('/api/config')).json();
  let timer = null;

  async function loadArchive(merge) {
    const photos = await (await fetch('/api/photos')).json();
    if (!merge) return queue.setArchive(photos);
    // After a reconnect: add photos we missed to the idle loop without disturbing playback.
    photos.filter((p) => !queue.knownIds.has(p.id)).forEach((p) => { queue.knownIds.add(p.id); queue.archive.push(p); });
  }

  function show(photo) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    const img = new Image();
    img.alt = `Photo by ${photo.visitorName}`;
    img.onload = () => {
      slide.appendChild(img);
      stage.appendChild(slide);
      requestAnimationFrame(() => slide.classList.add('active'));
      // Fade out and remove the previous slide(s).
      Array.from(stage.children).filter((s) => s !== slide).forEach((old) => {
        old.classList.remove('active');
        setTimeout(() => old.remove(), 900);
      });
      caption.textContent = photo.visitorName; // textContent: names are never parsed as HTML
      caption.hidden = false;
      empty.hidden = true;
      timer = setTimeout(tick, cfg.slideDurationMs); // timer starts once the image is visible
    };
    img.onerror = () => { timer = setTimeout(tick, 0); }; // skip broken files immediately
    img.src = photo.url;
  }

  function tick() {
    const item = queue.next();
    if (!item) { timer = setTimeout(tick, 2000); return; } // nothing uploaded yet
    show(item.photo);
  }

  await loadArchive(false);
  const socket = io();
  socket.on('connect', () => { socket.emit('display:join'); if (timer) loadArchive(true); });
  // Only enqueue: the running slide is never interrupted; the batch waits its turn.
  socket.on('photos:queued', ({ photos }) => queue.enqueue(photos));

  tick();
  document.addEventListener('keydown', (e) => { if (e.key === 'f') document.documentElement.requestFullscreen?.(); });
})();
