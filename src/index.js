import { handleLogin } from './routes/login.js';
import { handleUsers } from './routes/users.js';
import { handleFiles } from './routes/files.js';
import { handleFileGet, handleFileDelete } from './routes/file.js';
import { handleUploadStart } from './routes/upload-start.js';
import { handleUploadPart } from './routes/upload-part.js';
import { handleUploadComplete } from './routes/upload-complete.js';
import { handleUploadAbort } from './routes/upload-abort.js';
import { handleAdminCreateUser } from './routes/admin-create-user.js';
import { jsonResponse } from './lib/http.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/api/login' && method === 'POST') {
        return await handleLogin(request, env);
      }
      if (path === '/api/users' && method === 'GET') {
        return await handleUsers(request, env);
      }
      if (path === '/api/files' && method === 'GET') {
        return await handleFiles(request, env);
      }

      const fileMatch = path.match(/^\/api\/file\/(\d+)$/);
      if (fileMatch) {
        const params = { id: fileMatch[1] };
        if (method === 'GET') return await handleFileGet(request, env, params);
        if (method === 'DELETE') return await handleFileDelete(request, env, params);
      }

      if (path === '/api/upload/start' && method === 'POST') {
        return await handleUploadStart(request, env);
      }
      if (path === '/api/upload/part' && method === 'POST') {
        return await handleUploadPart(request, env);
      }
      if (path === '/api/upload/complete' && method === 'POST') {
        return await handleUploadComplete(request, env);
      }
      if (path === '/api/upload/abort' && method === 'POST') {
        return await handleUploadAbort(request, env);
      }
      if (path === '/api/admin/create-user' && method === 'POST') {
        return await handleAdminCreateUser(request, env);
      }

      // /api/로 시작하는데 위에서 매칭이 안 됐다면 404
      if (path.startsWith('/api/')) {
        return jsonResponse({ error: 'API를 찾을 수 없습니다.' }, 404);
      }

      // 그 외 모든 요청(index.html, admin.html 등)은 정적 파일로 처리
      return env.ASSETS.fetch(request);
    } catch (err) {
      return jsonResponse({ error: '서버 오류: ' + err.message }, 500);
    }
  }
};
