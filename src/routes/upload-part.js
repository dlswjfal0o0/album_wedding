import { getAuthUser } from '../lib/auth.js';
import { jsonResponse } from '../lib/http.js';

export async function handleUploadPart(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const uploadId = url.searchParams.get('uploadId');
  const partNumber = parseInt(url.searchParams.get('partNumber'), 10);

  if (!key || !uploadId || !partNumber) {
    return jsonResponse({ error: '업로드 정보가 올바르지 않습니다.' }, 400);
  }

  if (!key.startsWith(`${user.sub}/`)) {
    return jsonResponse({ error: '권한이 없습니다.' }, 403);
  }

  try {
    const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
    const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);
    return jsonResponse({ partNumber, etag: uploadedPart.etag });
  } catch (err) {
    return jsonResponse({ error: '파트 업로드 실패: ' + err.message }, 500);
  }
}
