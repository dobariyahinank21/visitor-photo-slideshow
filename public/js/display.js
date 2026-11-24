/* TV display: FIFO queue of new uploads, idle loop over older photos, 5 s per slide. */
(async function () {
  const stage = document.getElementById('stage');
  const caption = document.getElementById('caption');
  const empty = document.getElementById('empty');
  const queue = new PlaybackQueue();
  const cfg = await (await fetch('/api/config')).json();

  async function loadArchive(merge) {
    const photos = await (await fetch('/api/photos')).json();
    if (!merge) return queue.setArchive(photos);
    photos.filter((p) => !queue.knownIds.has(p.id)).forEach((p) => {
      queue.knownIds.add(p.id);
      queue.archive.push(p);
    });
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
      Array.from(stage.children).filter((s) => s !== slide).forEach((old) => {
        old.classList.remove('active');
        setTimeout(() => old.remove(), 900);
      });
      caption.textContent = photo.visitorName;
      caption.hidden = false;
      empty.hidden = true;
      setTimeout(tick, cfg.slideDurationMs);
    };
    img.onerror = () => {
      console.error('Could not load image', photo.url);
      setTimeout(tick, 1000); // skip broken file, without spinning
    };
    img.src = photo.url;
  }

  function tick() {
    const item = queue.next();
    if (!item) { setTimeout(tick, 2000); return; }
    show(item.photo);
  }

  await loadArchive(false);
  tick(); // start the slideshow first; it must not depend on Socket.io

  if (typeof io === 'function') {
    const socket = io();
    let connectedBefore = false;
    socket.on('connect', () => {
      socket.emit('display:join');
      if (connectedBefore) loadArchive(true); // after a reconnect, pick up missed photos
      connectedBefore = true;
    });
    socket.on('photos:queued', ({ photos }) => queue.enqueue(photos));
  } else {
    console.error('Socket.io failed to load: live updates are disabled.');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'f') document.documentElement.requestFullscreen?.();
  });
})();