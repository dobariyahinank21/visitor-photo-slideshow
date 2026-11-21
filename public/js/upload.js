/* Upload page: client-side validation (limits come from the server) and submission. */
(async function () {
  const $ = (id) => document.getElementById(id);
  const form = $('form'), status = $('status'), submit = $('submit');
  const cfg = await (await fetch('/api/config')).json();
  $('limits').textContent =
    `JPEG, PNG or WebP · up to ${cfg.maxFilesPerBatch} photos · max ${cfg.maxFileBytes / 1048576} MB each`;

  function show(kind, messages) {
    status.innerHTML = '';
    if (!messages.length) return;
    const box = document.createElement('div');
    box.className = `msg ${kind}`;
    const ul = document.createElement('ul');
    messages.forEach((m) => { const li = document.createElement('li'); li.textContent = m; ul.appendChild(li); });
    box.appendChild(ul);
    status.appendChild(box);
  }

  /** Mirrors the server rules; the server remains the authority. */
  function validate() {
    const errors = [];
    const name = $('name').value.trim();
    const files = Array.from($('photos').files);
    if (!name) errors.push('Please enter your name.');
    if (files.length === 0) errors.push('Please choose at least one photo.');
    if (files.length > cfg.maxFilesPerBatch) errors.push(`Choose at most ${cfg.maxFilesPerBatch} photos.`);
    files.forEach((f) => {
      if (!cfg.allowedMimeTypes.includes(f.type)) errors.push(`${f.name}: only JPEG, PNG and WebP are allowed.`);
      else if (f.size > cfg.maxFileBytes) errors.push(`${f.name}: larger than ${cfg.maxFileBytes / 1048576} MB.`);
    });
    if (!$('consent').checked) errors.push('You must consent to public display.');
    return errors;
  }

  $('photos').addEventListener('change', () => {
    const box = $('previews');
    box.innerHTML = '';
    Array.from($('photos').files).slice(0, cfg.maxFilesPerBatch).forEach((f) => {
      if (!cfg.allowedMimeTypes.includes(f.type)) return;
      const img = document.createElement('img');
      img.alt = '';
      img.src = URL.createObjectURL(f);
      img.onload = () => URL.revokeObjectURL(img.src);
      box.appendChild(img);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errors = validate();
    if (errors.length) return show('error', errors);
    show('ok', []);
    submit.disabled = true;
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: new FormData(form) });
      const data = await res.json();
      if (!res.ok) return show('error', data.errors || ['Upload failed.']);
      const welcome = data.isReturning ? 'Welcome back! ' : '';
      show('ok', [`${welcome}Thanks! ${data.uploaded} photo(s) uploaded. Look at the screen.`]);
      form.reset();
      $('previews').innerHTML = '';
    } catch {
      show('error', ['Network error. Please try again.']);
    } finally {
      submit.disabled = false;
    }
  });
})();
