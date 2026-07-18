# 배포 및 운영 정보

## 링크

- 프로덕션: https://naver-place-marketing-erp.vercel.app
- GitHub: https://github.com/jangsamarketing-hub/Mkt.ERP
- 원격 저장소: `https://github.com/jangsamarketing-hub/Mkt.ERP.git`
- 기본 브랜치: `main`
- Vercel 프로젝트: `naver-place-marketing-erp`
- Supabase project ref: `iutsvjtrklasrmjukkie`

## 최근 확인 기준

- 문서 작성 시점 로컬 최근 커밋: `3392169 Trigger Vercel production deployment`
- 배포 사이트는 HTTP 200과 페이지 제목 `매장 마케팅 ERP`가 확인된 이력이 있다.
- Git 작성자 이메일과 GitHub/Vercel 계정 연결 문제로 자동 배포가 차단된 이력이 있다.

## 환경변수

실제 값은 `.env.local`, Vercel Environment Variables, Supabase Secret에만 둔다.

예상 이름은 `.env.example`을 기준으로 한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- 검색광고 프록시 URL/토큰 등 서버 전용 값

클라이언트 번들에 Service Role, SearchAd Secret, 외부 계정 비밀번호를 넣지 않는다.

## 표준 배포 순서

1. 변경 전 `git status` 확인
2. `npm run build`
3. 민감정보 검색
4. 작은 단위 커밋과 push
5. Vercel Production 상태 확인
6. 프로덕션 주요 화면 smoke test
7. 실패 시 이전 정상 배포로 롤백

## Vercel 자동 배포 차단 점검

- Git 커밋 이메일이 GitHub 계정에서 확인된 이메일인지 확인
- Vercel Authentication에 올바른 GitHub 계정이 연결됐는지 확인
- 프로젝트 Git Integration이 해당 저장소를 읽을 권한이 있는지 확인
- 저장소 공개/비공개 변경 후 권한을 다시 승인

## 운영 주의

- 저장소 공개 상태에서는 비밀키가 한 번이라도 커밋되지 않았는지 검사한다.
- 과거 대화에 노출된 검색광고 키는 폐기/재발급한다.
- `.env.local`, 업로드 원본, 고객 데이터는 Git에 넣지 않는다.
- Vercel 함수에서 장시간 지도 브라우징을 실행하지 않는다.
- 프로덕션 광고 변경은 dry-run과 관리자 승인을 통과해야 한다.

