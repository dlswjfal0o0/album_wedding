import { getAuthUser } from '../../_lib/auth.js';
import { jsonResponse } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const { fileId, key, uploadId, parts } = await request.json();

  if (!fileId || !key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return jsonResponse({ error: '업로드 완료 정보가 올바르지 않습니다.' }, 400);
  }

  if (!key.startsWith(`${user.sub}/`)) {
    return jsonResponse({ error: '권한이 없습니다.' }, 403);
  }

  try {
    const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
    await multipartUpload.complete(parts);

    await env.DB.prepare("UPDATE files SET status = 'complete' WHERE id = ?")
      .bind(fileId)
      .run();

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: '업로드 완료 처리 실패: ' + err.message }, 500);
  }
}
