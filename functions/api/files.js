import { getAuthUser } from '../_lib/auth.js';
import { jsonResponse } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all'; // all | photo | video
  const uploader = url.searchParams.get('uploader'); // 사용자 id 또는 'all'

  let query = `SELECT id, uploader_id, uploader_name, original_filename, mime_type,
                      file_type, size_bytes, created_at
               FROM files WHERE status = 'complete'`;
  const params = [];

  if (type === 'photo' || type === 'video') {
    query += ' AND file_type = ?';
    params.push(type);
  }

  if (uploader && uploader !== 'all') {
    query += ' AND uploader_id = ?';
    params.push(uploader);
  }

  query += ' ORDER BY created_at DESC LIMIT 1000';

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ files: results });
}
