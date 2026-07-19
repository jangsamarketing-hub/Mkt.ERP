# Stage 1B — 관리자 인증 경계

## 결론

개발 중에는 한 개의 고정 관리자 계정을 사용하되 아이디·비밀번호 원문을 브라우저 코드나 Git에 넣지 않는다. 로그인 API가 서버 전용 환경변수의 아이디와 scrypt hash를 검증하고, 성공 시 8시간짜리 서명된 HttpOnly 쿠키를 발급한다.

## 보호 범위

- `/login`, 로그인·로그아웃 API만 공개
- ERP 화면은 세션 없으면 로그인으로 이동
- ERP·네이버 지도·검색광고 API는 세션 없으면 401
- 고정 개발 관리자는 전체 매장 접근 가능
- 이후 직원·사장님 계정은 같은 `canAccessStore` 경계에서 담당 `store_id`만 허용

## 환경변수

- `ERP_ADMIN_USERNAME`: 서버 전용 관리자 아이디
- `ERP_ADMIN_PASSWORD_HASH`: scrypt hash만 저장, 비밀번호 원문 금지
- `AUTH_SESSION_SECRET`: 32자 이상 무작위 서버 비밀값
- `AUTH_SESSION_TTL_SECONDS`: 900~86,400초, 기본 28,800초

실제 값은 `.env.local` 또는 Vercel Environment Variables에만 저장한다. `.env.example`에는 이름만 둔다.

## 현재 한계와 다음 교체점

- 고정 계정은 개발용 임시 인증 공급자다.
- 운영 전에는 비밀번호 강도를 높이고 로그인 시도 제한을 붙인다.
- Stage 1C에서 `organizations`, `profiles`, `store_members`와 연결한다.
- 다중 사용자 운영 시 Supabase Auth 세션으로 교체하되 `AppSession`과 store authorization 계약은 유지한다.

## 롤백

`proxy.ts`, `app/api/auth`, `lib/auth`, `/login`을 한 커밋으로 되돌릴 수 있다. 인증을 우회하는 구경로를 남기지 않는다.

## 검증 결과

- 인증·비밀번호·세션·담당 매장 경계 테스트 5개 추가
- 전체 자동 테스트 16개 통과
- TypeScript 검사 및 production build 통과
- 로컬 smoke: 비로그인 API 401 → 로그인 200 → 인증된 API 입력검증 400 → 로그아웃 200 → API 401
- 실제 관리자 아이디·비밀번호 원문은 소스와 커밋에 없음
