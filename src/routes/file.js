import { getAuthUser } from '../lib/auth.js';
import { jsonResponse } from '../lib/http.js';

export async function handleFileGet(request, env, params) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const fileId = params.id;
  const file = await env.DB.prepare("SELECT * FROM files WHERE id = ? AND status = 'complete'")
    .bind(fileId)
    .first();

  if (!file) return jsonResponse({ error: '파일을 찾을 수 없습니다.' }, 404);

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'view'; // view | download

  const rangeHeader = request.headers.get('Range');
  let range = null;

  if (rangeHeader) {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : file.size_bytes - 1;
      range = { offset: start, length: end - start + 1 };
    }
  }

  const object = await env.BUCKET.get(file.r2_key, range ? { range } : {});
  if (!object) return jsonResponse({ error: '파일 데이터를 찾을 수 없습니다.' }, 404);

  const headers = new Headers();
  headers.set('Content-Type', file.mime_type);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=3600');

  const dispositionType = mode === 'download' ? 'attachment' : 'inline';
  headers.set(
    'Content-Disposition',
    `${dispositionType}; filename*=UTF-8''${encodeURIComponent(file.original_filename)}`
  );

  if (range) {
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${file.size_bytes}`);
    headers.set('Content-Length', String(range.length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(file.size_bytes));
  return new Response(object.body, { status: 200, headers });
}

export async function handleFileDelete(request, env, params) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const fileId = params.id;
  const file = await env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(fileId).first();

  if (!file) return jsonResponse({ error: '파일을 찾을 수 없습니다.' }, 404);
  if (file.uploader_id !== user.sub) {
    return jsonResponse({ error: '본인이 올린 파일만 삭제할 수 있습니다.' }, 403);
  }

  await env.BUCKET.delete(file.r2_key);
  await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run();

  return jsonResponse({ success: true });
}
