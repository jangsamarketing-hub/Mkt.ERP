# 맞춤장사 OS 인수인계

다른 GPT, Codex 또는 개발자가 이 프로젝트를 이어갈 때는 아래 순서로 읽습니다.

1. [문서팩 안내](./docs/handoff-2026-07-19/README.md)
2. [통합 PRD](./docs/handoff-2026-07-19/01_PRD_맞춤장사OS.md)
3. [데이터베이스 규격](./docs/handoff-2026-07-19/02_DATABASE_SPEC.md)
4. [페이지별 로직](./docs/handoff-2026-07-19/03_PAGE_LOGIC_SPEC.md)
5. [분석 공식](./docs/handoff-2026-07-19/04_ANALYTICS_FORMULAS.md)
6. [구현 상태 감사](./docs/handoff-2026-07-19/05_IMPLEMENTATION_STATUS.md)
7. [개발 순서와 완료 기준](./docs/handoff-2026-07-19/06_ROADMAP_AND_ACCEPTANCE.md)
8. [배포/운영 정보](./docs/handoff-2026-07-19/07_DEPLOYMENT_OPERATIONS.md)
9. [화면 이미지 목록](./docs/handoff-2026-07-19/08_VISUAL_REFERENCE_INDEX.md)
10. [소스 위치 지도](./docs/handoff-2026-07-19/09_SOURCE_MAP.md)

## 가장 중요한 판단

- 현재 UI를 폐기하지 않는다. 사용자가 여러 차례 이미지로 조정한 ERP 흐름이 목표 화면이다.
- 모든 데이터는 `store_id`를 중심으로 연결한다.
- 원본 업로드, 파싱 결과, 분석 스냅샷, 화면 조회를 분리한다.
- 데이터가 없는 기간은 `0`이 아니라 `데이터 없음`이다.
- 여신금융 마스킹 카드번호만으로 실제 개인 신규/재방문을 확정하지 않는다.
- 광고 쓰기 기능은 조회, 저장, 추천, 관리자 승인, 실행 순서로 만든다.
- 지도 페이지 수 수집은 Vercel 요청 함수가 아니라 별도 Playwright 워커로 옮긴다.

## 다음 한 가지 작업

첫 작업은 `store_id` 기반 Supabase 원장과 권한 구조를 확정한 뒤, 현재 `localStorage`에 있는 일일업무/매장 체크/통화 히스토리를 DB로 이전하는 것입니다. 이 작업이 끝나야 각 화면이 같은 매장 데이터를 안정적으로 공유합니다.

