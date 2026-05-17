const SUPABASE_URL = 'https://kcpcosksdsctlkartyeq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KZ0VWWiEzNHRYNz8jojoDg_ks-9Yt3p';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getVoterToken() {
  let token = localStorage.getItem('voter_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('voter_token', token);
  }
  return token;
}
