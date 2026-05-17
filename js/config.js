const SUPABASE_URL = 'https://kcpcosksdsctlkartyeq.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_secret__XrYlZW0GVoI1WqSReLG0w_9WdbeIE_';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getVoterToken() {
  let token = localStorage.getItem('voter_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('voter_token', token);
  }
  return token;
}
