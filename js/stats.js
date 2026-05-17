async function loadStats() {
  const list = document.getElementById('stats-list');
  list.innerHTML = '<p>Loading…</p>';

  const { data: photos } = await db
    .from('photos')
    .select('id, storage_path, uploader_name');

  if (!photos || photos.length === 0) {
    list.innerHTML = '<p>No photos uploaded yet. <a href="index.html">Be the first!</a></p>';
    return;
  }

  const [{ data: votes }, { data: likesData }] = await Promise.all([
    db.from('votes').select('winner_id, matches(photo_a_id, photo_b_id)'),
    db.from('likes').select('photo_id'),
  ]);

  const stats = Object.fromEntries(
    photos.map(p => [p.id, { wins: 0, losses: 0, likes: 0, photo: p }])
  );

  (votes || []).forEach(({ winner_id, matches: match }) => {
    if (!match) return;
    const loserId = match.photo_a_id === winner_id ? match.photo_b_id : match.photo_a_id;
    if (stats[winner_id]) stats[winner_id].wins++;
    if (stats[loserId]) stats[loserId].losses++;
  });

  (likesData || []).forEach(({ photo_id }) => {
    if (stats[photo_id]) stats[photo_id].likes++;
  });

  const ranked = Object.values(stats).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  const signedUrls = await Promise.all(
    ranked.map(({ photo }) =>
      db.storage.from('dog-photos').createSignedUrl(photo.storage_path, 600)
    )
  );

  list.innerHTML = '';

  ranked.forEach(({ wins, losses, likes, photo }, i) => {
    const total = wins + losses;
    const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const signedUrl = signedUrls[i].data?.signedUrl;

    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <span class="rank">#${i + 1}</span>
      <img src="${signedUrl}" alt="Photo by ${photo.uploader_name}">
      <div class="stat-info">
        <div class="uploader">${photo.uploader_name}</div>
        <div class="win-bar"><div class="win-bar-fill" style="width:${rate}%"></div></div>
        <div class="rate">${rate}% win rate</div>
        <div class="score">${wins}W · ${losses}L · ${total} matchups</div>
        <div class="likes-row">❤️ ${likes} like${likes !== 1 ? 's' : ''}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

loadStats();
