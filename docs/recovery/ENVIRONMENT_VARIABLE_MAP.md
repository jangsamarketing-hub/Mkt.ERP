# 환경변수 지도

값은 이 문서, 채팅, commit에 기록하지 않는다. 표는 이름과 사용 경계만 정의한다.

## 1. 현재 코드에서 사용하는 변수

| 변수명 | 사용 위치 | 용도 | 노출 경계 |
|---|---|---|---|
| `SUPABASE_URL` | `lib/supabase/admin.ts` | ERP Supabase URL | 서버 전용 |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` | 관리자 DB client | 절대 클라이언트 노출 금지 |
| `NAVER_SEARCHAD_CUSTOMER_ID` | `app/api/naver-searchad/keyword-volume/route.ts` | 검색광고 고객 ID | 서버 전용 |
| `NAVER_SEARCHAD_ACCESS_LICENSE` | 같은 route | API access license | 서버 전용 |
| `NAVER_SEARCHAD_SECRET_KEY` | 같은 route | API 서명 | 서버 전용 |

현재 `.env.example`에는 Supabase 두 변수만 있어 SearchAd 변수 이름 문서화가 누락되어 있다. Stage 1 전 값 없이 이름만 보완한다.

## 2. 인증 도입 시 제안 변수

| 변수명 | 용도 | 상태 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저용 Supabase endpoint | 제안 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 브라우저 Auth/RLS용 공개 key | 제안 |
| `SUPABASE_SECRET_KEY` | 신규 server secret 체계 사용 시 | 도입 가능성 검토 |
| `APP_BASE_URL` | 계약·보고 공유 링크 절대 URL | 제안 |
| `SHARE_TOKEN_PEPPER` | 공개 토큰 digest 보강 | 제안, 서버 전용 |
| `AI_PROVIDER` | AI provider 선택 | 제안 |
| `OPENAI_API_KEY` 또는 provider별 key | 리뷰 분석 adapter | 해당 기능 도입 시 |

기존 `SUPABASE_SERVICE_ROLE_KEY`는 즉시 이름만 바꾸지 않는다. Auth boundary가 완성될 때까지 현재 route 동작을 보존하고, route별 최소 권한 전환 계획과 함께 교체한다.

## 3. 사용 위치 원칙

- `NEXT_PUBLIC_` 변수에는 공개되어도 되는 URL과 publishable key만 둔다.
- service role, secret key, SearchAd secret, AI key는 Server Component, Route Handler, Worker에서만 읽는다.
- log, build output, error response에 값이나 서명 원문을 남기지 않는다.
- Vercel Production/Preview/Development 값을 분리한다.
- `.env.local`, dump, 실제 credential export는 gitignore 대상이다.
- secret rotation은 배포와 분리된 운영 체크리스트로 기록한다.

## 4. 외부 매장 계정

네이버·광고·배달앱 등 매장 ID/PW는 ERP DB에 평문 저장하지 않는다. 초기에는 대표가 관리하는 외부 Google Sheet 또는 암호관리 도구에 두고, ERP에는 다음만 둔다.

- 계정 보유 여부
- 계정 종류
- 보관 위치의 식별 가능한 별칭
- 마지막 확인일과 확인 직원
- 2차 인증 필요 여부
- 접근 요청 상태

직원이 빠르게 복사해야 하는 요구는 이후 권한·접근 로그·자동 마스킹·퇴사자 회수가 가능한 팀용 vault로 해결한다.

## 5. 커밋 전 검사

- `.env*` 값이 staged file에 없는지 확인
- Supabase JWT 형태, Naver secret, API key pattern 검사
- screenshot과 markdown에 실제 계정 비밀번호가 없는지 확인
- 브라우저 console과 test fixture에 secret이 없는지 확인

