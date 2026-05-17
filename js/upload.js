const form = document.getElementById('upload-form');
const previewGrid = document.getElementById('preview-grid');
const statusMsg = document.getElementById('status');

document.getElementById('photo-file').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  previewGrid.innerHTML = '';
  files.forEach(f => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    img.className = 'preview-thumb';
    previewGrid.appendChild(img);
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('uploader-name').value.trim();
  const files = Array.from(document.getElementById('photo-file').files);
  if (!name || files.length === 0) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  let failed = 0;
  for (let i = 0; i < files.length; i++) {
    statusMsg.textContent = `Uploading ${i + 1} of ${files.length}…`;

    const file = files[i];
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from('dog-photos')
      .upload(path, file);

    if (uploadError) {
      failed++;
      statusMsg.textContent = `Storage error on photo ${i + 1}: ${uploadError.message}`;
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    const { error: insertError } = await db
      .from('photos')
      .insert({ storage_path: path, uploader_name: name });

    if (insertError) {
      failed++;
      statusMsg.textContent = `DB error on photo ${i + 1}: ${insertError.message}`;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const succeeded = files.length - failed;
  statusMsg.textContent = failed === 0
    ? `Done! ${succeeded} photo${succeeded !== 1 ? 's' : ''} uploaded by ${name}.`
    : `${succeeded} uploaded, ${failed} failed. Try re-uploading the failed ones.`;

  form.reset();
  previewGrid.innerHTML = '';
  submitBtn.disabled = false;
});
