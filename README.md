# 우리 가족 앨범 (weddingalbum) — Worker 버전 설치 가이드

진행하시다가 만드신 Cloudflare 프로젝트가 **Pages가 아니라 Worker**로 만들어진 것을 확인했습니다. 그래서 코드 구조를 Worker에 맞게 다시 정리했어요. 기능은 이전과 완전히 동일합니다 (로그인 / 업로드 / 사진·동영상 모아보기 / 삭제). 오히려 이번 방식은 R2·D1 연결을 화면 클릭 없이 설정 파일로 자동 처리해서, 그동안 막혔던 바인딩 문제도 해결됩니다.

## 무엇이 바뀌었나

- `functions/` 폴더 (Pages 전용 방식) → `src/` 폴더의 일반 Worker 코드로 변경
- `index.html`, `admin.html` → `public/` 폴더 안으로 이동
- 새 파일 `wrangler.jsonc` 추가: 이 파일 안에 R2 버킷, D1 데이터베이스 연결 정보를 직접 적어두면, GitHub에 올릴 때 Cloudflare가 자동으로 연결해줍니다 (그 말썽이던 "Add a binding" 화면을 거치지 않아도 됨)

## 1. wrangler.jsonc에서 딱 한 군데만 수정하기

`wrangler.jsonc` 파일을 열어보면 이렇게 되어 있어요:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "weddingalbum-db",
    "database_id": "여기에-D1-데이터베이스-ID를-붙여넣으세요"
  }
]
```

Cloudflare 대시보드 → **Storage & databases → D1 SQLite Database** → 만드신 데이터베이스 클릭 → 화면에 보이는 **Database ID** (긴 영문/숫자 조합)를 복사해서, `database_id` 자리에 붙여넣어 주세요.

그리고 `database_name`과 `r2_buckets`의 `bucket_name`이 실제로 만드신 이름과 정확히 같은지도 한 번 확인해주세요 (D1 데이터베이스 이름, R2 버킷 이름 `weddingalbum-files`). 다르면 실제 이름으로 고쳐주세요.

## 2. GitHub 저장소 통째로 교체하기

기존 저장소에 있던 `functions` 폴더, 루트의 `index.html`/`admin.html`은 이제 쓰지 않으니 지워주시고, 이 폴더 전체 내용으로 교체해주세요. 즉 저장소 최상위에 다음이 있어야 합니다:

```
wrangler.jsonc
schema.sql
README.md
src/
public/
```

GitHub 웹 화면에서: 기존 파일들을 삭제(各 파일 들어가서 휴지통 아이콘) 하거나, 새로 받은 폴더 내용을 같은 자리에 업로드해서 덮어쓰면 됩니다. 가장 깔끔한 방법은 저장소를 새로 만들어서 이 폴더 내용만 올리는 것입니다.

## 3. D1 테이블 만들기 (아직 안 하셨다면)

D1 데이터베이스의 **Console** 탭에 `schema.sql` 내용을 붙여넣고 실행해서 `users`, `files` 테이블을 만들어주세요.

## 4. 비밀 값(Secrets) 등록

Cloudflare 대시보드 → 해당 프로젝트(`weddingalbum`) → **Settings → Variables and Secrets** → **Add**:

- `JWT_SECRET` (Type: Secret) — 아무 긴 임의의 문자열
- `ADMIN_SETUP_KEY` (Type: Secret) — 계정 생성 화면 보호용 비밀번호

저장 후 적용을 위해 재배포가 필요할 수 있습니다 (5번에서 GitHub에 푸시하면 자동으로 다시 배포됩니다).

## 5. GitHub에 푸시

수정한 `wrangler.jsonc`와 새 폴더 구조를 GitHub에 올리면(푸시하면), Cloudflare가 자동으로 감지해서 다시 배포합니다. 이때 `r2_buckets`/`d1_databases` 설정을 읽어서 **자동으로 바인딩까지 연결**됩니다.

배포가 끝나면 프로젝트의 **Bindings** 탭에 `BUCKET`, `DB`가 연결된 것으로 보이는지 확인해주세요.

## 6. 가족 계정 만들기 + 사용하기

배포된 주소 + `/admin.html`로 접속해서 가족 계정을 만들고, 메인 주소에서 로그인해서 사용하면 됩니다. (이전에 안내드린 사용법과 동일합니다.)

## 문제가 생기면

- 사이트 접속 시 빈 화면이나 오류가 뜨면 → `wrangler.jsonc`의 `database_id`를 정확히 채웠는지, JSON 문법(쉼표, 괄호)이 깨지지 않았는지 확인해주세요.
- 로그인/업로드가 안 되면 → Bindings 탭에서 `BUCKET`, `DB`가 연결되어 있는지, Variables and Secrets에 `JWT_SECRET`/`ADMIN_SETUP_KEY`가 등록되어 있는지 확인해주세요.
- 막히는 화면은 언제든 캡처해서 보내주세요.
