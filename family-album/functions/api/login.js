import { verifyPassword, signJWT } from '../_lib/auth.js';
import { jsonResponse } from '../_lib/http.js';

export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return jsonResponse({ error: '아이디와 비밀번호를 입력해주세요.' }, 400);
    }

    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (!user) {
      return jsonResponse({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return jsonResponse({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
    }

    const token = await signJWT(
      { sub: user.id, username: user.username, name: user.display_name },
      env.JWT_SECRET
    );

    return jsonResponse({ token, displayName: user.display_name, userId: user.id });
  } catch (err) {
    return jsonResponse({ error: '로그인 중 오류가 발생했습니다: ' + err.message }, 500);
  }
}
