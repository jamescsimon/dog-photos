const voterToken = getVoterToken();
const likedPhotos = new Set();

async function loadFeed() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '<p class="loading">Loading…</p>';

  const { data: photos } = await db
    .from('photos')
    .select('id, storage_path, uploader_name')
    .order('created_at', { ascending: false });

  if (!photos || photos.length === 0) {
    feed.innerHTML = '<p class="empty">No photos yet. <a href="index.html">Upload the first one!</a></p>';
    return;
  }

  const [{ data: myLikes }, { data: allLikes }] = await Promise.all([
    db.from('likes').select('photo_id').eq('voter_token', voterToken),
    db.from('likes').select('photo_id'),
  ]);

  (myLikes || []).forEach(l => likedPhotos.add(l.photo_id));

  const countMap = {};
  (allLikes || []).forEach(l => {
    countMap[l.photo_id] = (countMap[l.photo_id] || 0) + 1;
  });

  const urlResults = await Promise.all(
    photos.map(p => db.storage.from('dog-photos').createSignedUrl(p.storage_path, 600))
  );

  feed.innerHTML = '';

  photos.forEach((photo, i) => {
    const signedUrl = urlResults[i].data?.signedUrl;
    const liked = likedPhotos.has(photo.id);
    const count = countMap[photo.id] || 0;

    const card = document.createElement('article');
    card.className = 'feed-card';
    card.innerHTML = `
      <div class="feed-header">
        <span class="feed-uploader">${photo.uploader_name}</span>
      </div>
      <img src="${signedUrl}" alt="Photo by ${photo.uploader_name}">
      <div class="feed-footer">
        <button
          class="like-btn ${liked ? 'liked' : ''}"
          data-id="${photo.id}"
          aria-label="${liked ? 'Unlike' : 'Like'}"
        >${liked ? '❤️' : '🤍'}</button>
        <span class="like-count" id="count-${photo.id}" data-count="${count}">
          ${count} like${count !== 1 ? 's' : ''}
        </span>
      </div>
    `;
    feed.appendChild(card);
  });

  feed.addEventListener('click', (e) => {
    const btn = e.target.closest('.like-btn');
    if (btn) toggleLike(btn.dataset.id);
  });
}

async function toggleLike(photoId) {
  const btn = document.querySelector(`.like-btn[data-id="${photoId}"]`);
  const countEl = document.getElementById(`count-${photoId}`);
  const isLiked = likedPhotos.has(photoId);
  const prev = parseInt(countEl.dataset.count);
  const next = isLiked ? Math.max(0, prev - 1) : prev + 1;

  // Optimistic update
  likedPhotos[isLiked ? 'delete' : 'add'](photoId);
  btn.classList.toggle('liked', !isLiked);
  btn.textContent = isLiked ? '🤍' : '❤️';
  btn.setAttribute('aria-label', isLiked ? 'Like' : 'Unlike');
  countEl.dataset.count = next;
  countEl.textContent = `${next} like${next !== 1 ? 's' : ''}`;

  if (isLiked) {
    await db.from('likes').delete()
      .eq('photo_id', photoId)
      .eq('voter_token', voterToken);
  } else {
    await db.from('likes').insert({ photo_id: photoId, voter_token: voterToken });
  }
}

loadFeed();
