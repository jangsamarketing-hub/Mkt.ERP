# 소스 코드 지도

## 프론트엔드

### `app/page.tsx`

현재 11개 주요 화면, 샘플 데이터, 일부 API 호출과 상태 로직이 함께 들어 있는 큰 파일이다.

포함 화면:

- Dashboard
- AdPage
- InflowPage
- SalesPage
- AdminDailyPage
- TasksPage
- OwnerReportPage
- WeeklyFlowPage
- QuestionnairePage

다음 단계에서 `app/(admin)/...` 라우트와 도메인별 컴포넌트로 분리한다.

### `components/daily-tasks/daily-tasks-page.tsx`

- 업무 수집함
- 아이젠하워 매트릭스
- 통화 요약/업무 후보
- 현재 브라우저 임시 저장 로직 다수

### `components/stores/store-info-page.tsx`

- 매장 선택/정보
- 내부 메모
- 세팅 체크
- 키워드/통화 히스토리 일부
- 현재 브라우저 임시 저장 로직 다수

### `app/globals.css`

ERP 전체 레이아웃, 고밀도 표, 신호등, 반응형 스타일.

## API

### `app/api/erp/stores/route.ts`

매장 조회/추가. 수정/삭제와 입력 검증/RLS 보강이 필요하다.

### `app/api/erp/dashboard/route.ts`

매장과 최근 플레이스 주간 유입 조회. 카드/광고/업무 통합이 필요하다.

### `app/api/erp/place-uploads/route.ts`

네이버 플레이스 CSV 업로드, Storage 저장, 중복 검사, 정규화 DB 저장.

### `app/api/erp/card-uploads/route.ts`

여신금융 XLS/XLSX 업로드, Storage 저장, canonical 거래 저장과 조회.

### `app/api/naver-searchad/keyword-volume/route.ts`

검색광고 검색량 조회. 비밀키 노출 방지와 계정별 연결 검증이 필요하다.

### `app/api/naver-map/page-count/route.ts`

지도 페이지 수 확인 시도. 서버 요청 차단으로 운영용으로 사용하지 말고 별도 워커로 교체한다.

## 파서/데이터 접근

### `lib/place-csv/parser.ts`

플레이스 CSV 섹션 파싱과 정규화.

### `lib/credit-finance/parser.ts`

여신금융 헤더 탐색, 승인/취소 정규화, 거래키 생성.

### `lib/supabase/admin.ts`

서버 전용 Supabase 관리자 클라이언트. Service Role이 클라이언트에 노출되지 않게 유지한다.

## 마이그레이션

- `202607180001_place_weekly_ingestion.sql`
- `202607180002_place_ingestion_hardening.sql`
- `202607180003_credit_finance_ledger.sql`
- `202607180004_card_time_summary.sql`

원격에 이미 존재하지만 이 저장소 migration에 없는 초기 테이블이 있을 수 있다. 새 migration 전에 Supabase 실제 schema를 dump해 기준선을 만든다.

## 기존 문서

- `prd.md`: 긴 형태의 초기 통합 PRD
- `visual-references.md`: 대화 이미지 맥락
- `docs/project-context.md`: 프로젝트 컨텍스트
- `docs/working-context.md`: 작업 중 요약
- `docs/implementation-audit.md`: 초기 구현 감사
- `docs/erp-v05-source-audit.md`: 외부 V0.5 소스 재사용 판단
- `docs/supabase-setup.md`: Supabase 설정

## 권장 리팩터링 구조

```text
app/
  (admin)/dashboard
  (admin)/stores
  (admin)/tasks
  (admin)/place
  (admin)/sales
  (owner)/report/[token]
features/
  stores/
  tasks/
  place-insights/
  credit-finance/
  keywords/
  search-ads/
  reports/
lib/
  db/
  storage/
  auth/
  analytics/
workers/
  naver-map/
```

