import { getAuthUser } from '../_lib/auth.js';
import { jsonResponse } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const { results } = await env.DB.prepare(
    'SELECT id, display_name FROM users ORDER BY display_name'
  ).all();

  return jsonResponse({ users: results });
}
