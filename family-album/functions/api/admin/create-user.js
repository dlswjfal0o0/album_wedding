import { hashPassword } from '../../_lib/auth.js';
import { jsonResponse } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const setupKey = request.headers.get('X-Setup-Key');

  if (!setupKey || setupKey !== env.ADMIN_SETUP_KEY) {
    return jsonResponse({ error: '관리자 키가 올바르지 않습니다.' }, 403);
  }

  const { username, password, displayName } = await request.json();

  if (!username || !password || !displayName) {
    return jsonResponse({ error: '아이디, 비밀번호, 표시 이름을 모두 입력해주세요.' }, 400);
  }

  if (password.length < 4) {
    return jsonResponse({ error: '비밀번호는 4자 이상이어야 합니다.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first();

  if (existing) {
    return jsonResponse({ error: '이미 존재하는 아이디입니다.' }, 409);
  }

  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
  )
    .bind(username, passwordHash, displayName)
    .run();

  return jsonResponse({ success: true });
}
