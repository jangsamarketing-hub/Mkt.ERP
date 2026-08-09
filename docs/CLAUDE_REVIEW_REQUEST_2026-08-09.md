# 장사 ERP 코드 검수 요청

검수 대상 브랜치: `feat/daily-task-command-center`  
기준 커밋: `fc59c0c`  
전체 인수인계: `docs/HANDOFF_CURRENT_2026-08-09.md`

## 제품 목적

음식점 마케팅 대행사가 여러 매장을 같은 `store_id` 원장으로 관리하고, 직원이 업무 증빙을 기입하면 사장님 공개 보고서에서 같은 내용을 확인하는 장사 ERP다.

## 이번 검수 범위

1. `components/daily-tasks/daily-tasks-page.tsx`
   - 기존 localStorage 업무함을 제거하고 실제 `erp_store_work_updates` 원장을 읽는지.
   - 업무 메모 또는 증빙 링크가 있을 때만 자동 `기입완료`가 되는지.
   - 수동 완료 버튼이나 하드코딩 완료 상태가 남아 있지 않은지.
2. `components/stores/store-info-page.tsx`
   - 매장 정보를 저장할 때 이미 기록된 업무 메모/사진 링크가 삭제되지 않는지.
3. `app/api/erp/stores/[storeId]/work-updates/route.ts`
   - 공개 링크에 비공개 계정/사업자/내부 메모가 나오지 않도록, 업무 증빙만 노출 가능한 구조인지.
   - PATCH에서 빈 요청이 기존 증빙을 의도치 않게 지우는 경로가 없는지.
4. `supabase/migrations/20260809110000_store_contract_cycles_draft.sql`
   - 4주(28일) 계약 cycle, 재계약, 과거 업무 보존 모델이 적절한지.
   - 원격 DB에 적용하기 전 필요한 rollback SQL과 backfill 절차 제안.

## 검수 원칙

- 현재 구현은 읽기/기입 중심이며, 검색광고 쓰기·자동입찰·자동 로그인은 범위 밖이다.
- 마스킹 카드번호 기반 신규/재방문은 내부 참고치로만 표시해야 한다.
- 관리자/매니저/사장님 권한은 서버 API에서 강제되어야 하며, UI 필터만으로 처리하면 안 된다.
- Secret, 비밀번호, Service Role Key를 코드/로그/문서/공개 페이지에 노출하면 안 된다.

## 원하는 결과 형식

아래 형식으로, 치명도 순서대로 지적해 달라.

1. 문제 위치 (파일/함수)
2. 왜 문제인지
3. 실제 운영에서 생길 영향
4. 최소 수정안
5. 반드시 추가할 테스트

기능 범위를 넓히지 말고, 이번 브랜치가 안전하게 일일업무 원장으로 전환되었는지 우선 검수해 달라.
