const voterToken = getVoterToken();
let currentMatch = null;
const MAX_MATCHUPS = 40;

async function loadMatchup() {
  const area = document.getElementById('vote-area');
  area.style.display = 'none';
  document.getElementById('counter').textContent = 'Loading…';

  const { data: photos, error } = await db
    .from('photos')
    .select('id, storage_path, uploader_name');

  if (error || !photos || photos.length < 2) {
    area.innerHTML = '<p>Not enough photos yet. <a href="index.html">Add some!</a></p>';
    area.style.display = 'block';
    return;
  }

  // Find pairs this voter has already voted on
  const { data: myVotes } = await db
    .from('votes')
    .select('match_id')
    .eq('voter_token', voterToken);

  const votedMatchIds = (myVotes || []).map(v => v.match_id);
  const seenPairs = new Set();

  if (votedMatchIds.length > 0) {
    const { data: seenMatches } = await db
      .from('matches')
      .select('photo_a_id, photo_b_id')
      .in('id', votedMatchIds);

    (seenMatches || []).forEach(m => {
      seenPairs.add([m.photo_a_id, m.photo_b_id].sort().join(','));
    });
  }

  // Find an unseen pair
  const ids = photos.map(p => p.id);
  const unseenPairs = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = [ids[i], ids[j]].sort().join(',');
      if (!seenPairs.has(key)) unseenPairs.push([ids[i], ids[j]]);
    }
  }

  const done = votedMatchIds.length;
  document.getElementById('counter').textContent =
    `Matchup ${done + 1} of ${MAX_MATCHUPS}`;

  if (unseenPairs.length === 0 || done >= MAX_MATCHUPS) {
    area.innerHTML = `
      <div class="done-msg">
        <p>You've voted on ${done} matchup${done !== 1 ? 's' : ''} — nice work!</p>
        <a href="stats.html"><button>See the Results</button></a>
      </div>`;
    area.style.display = 'flex';
    return;
  }

  const [aId, bId] = unseenPairs[Math.floor(Math.random() * unseenPairs.length)];
  const [minId, maxId] = [aId, bId].sort();

  // Get or create the match row (photo_a_id always < photo_b_id lexicographically)
  let matchId;
  const { data: existing } = await db
    .from('matches')
    .select('id')
    .eq('photo_a_id', minId)
    .eq('photo_b_id', maxId)
    .maybeSingle();

  if (existing) {
    matchId = existing.id;
  } else {
    const { data: created, error: matchErr } = await db
      .from('matches')
      .insert({ photo_a_id: minId, photo_b_id: maxId })
      .select('id')
      .single();

    if (matchErr) {
      // Race condition: another insert won; fetch the existing row
      const { data: retry } = await db
        .from('matches')
        .select('id')
        .eq('photo_a_id', minId)
        .eq('photo_b_id', maxId)
        .single();
      matchId = retry.id;
    } else {
      matchId = created.id;
    }
  }

  const photoA = photos.find(p => p.id === aId);
  const photoB = photos.find(p => p.id === bId);

  const [{ data: urlA }, { data: urlB }] = await Promise.all([
    db.storage.from('dog-photos').createSignedUrl(photoA.storage_path, 300),
    db.storage.from('dog-photos').createSignedUrl(photoB.storage_path, 300),
  ]);

  currentMatch = { matchId, aId, bId };

  document.getElementById('photo-a-img').src = urlA.signedUrl;
  document.getElementById('photo-a-name').textContent = `Uploaded by ${photoA.uploader_name}`;
  document.getElementById('photo-b-img').src = urlB.signedUrl;
  document.getElementById('photo-b-name').textContent = `Uploaded by ${photoB.uploader_name}`;

  document.querySelectorAll('.photo-card').forEach(b => b.disabled = false);
  area.style.display = 'flex';
}

async function vote(winnerId) {
  if (!currentMatch) return;

  document.querySelectorAll('.photo-card').forEach(b => b.disabled = true);

  const { error } = await db.from('votes').insert({
    match_id: currentMatch.matchId,
    winner_id: winnerId,
    voter_token: voterToken,
  });

  // 23505 = unique constraint violation (already voted) — just move on
  if (error && error.code !== '23505') {
    console.error(error);
    document.querySelectorAll('.photo-card').forEach(b => b.disabled = false);
    return;
  }

  loadMatchup();
}

document.getElementById('card-a').addEventListener('click', () => vote(currentMatch.aId));
document.getElementById('card-b').addEventListener('click', () => vote(currentMatch.bId));

loadMatchup();
