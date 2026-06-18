import { getAuthUser } from '../lib/auth.js';
import { jsonResponse } from '../lib/http.js';

export async function handleUploadAbort(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const { fileId, key, uploadId } = await request.json();

  try {
    if (key && uploadId) {
      const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
      await multipartUpload.abort();
    }
  } catch {
    // 이미 정리되었거나 존재하지 않는 업로드일 수 있으므로 무시
  }

  if (fileId) {
    await env.DB.prepare("DELETE FROM files WHERE id = ? AND status = 'uploading'")
      .bind(fileId)
      .run();
  }

  return jsonResponse({ success: true });
}
