import { getAuthUser } from '../../_lib/auth.js';
import { jsonResponse } from '../../_lib/http.js';

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_가-힣 ]/g, '_').slice(-100);
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

  const { filename, mimeType, size } = await request.json();

  if (!filename || !mimeType || !size) {
    return jsonResponse({ error: '파일 정보가 올바르지 않습니다.' }, 400);
  }

  let fileType;
  if (mimeType.startsWith('image/')) fileType = 'photo';
  else if (mimeType.startsWith('video/')) fileType = 'video';
  else return jsonResponse({ error: '사진 또는 동영상 파일만 업로드할 수 있습니다.' }, 400);

  const key = `${user.sub}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(filename)}`;

  const multipartUpload = await env.BUCKET.createMultipartUpload(key, {
    httpMetadata: { contentType: mimeType }
  });

  const result = await env.DB.prepare(
    `INSERT INTO files
       (uploader_id, uploader_name, r2_key, original_filename, mime_type, file_type, size_bytes, upload_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploading')`
  )
    .bind(user.sub, user.name, key, filename, mimeType, fileType, size, multipartUpload.uploadId)
    .run();

  return jsonResponse({
    fileId: result.meta.last_row_id,
    key,
    uploadId: multipartUpload.uploadId
  });
}
