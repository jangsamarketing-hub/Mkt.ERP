# 맞춤장사 OS 프로젝트 파일 지도

이 문서는 빠르게 파일을 찾기 위한 지도다. 기능을 새로 만들기 전, 기존 파일을 확장할 수 있는지 먼저 확인한다.

| 경로 | 역할 | 주의점 |
|---|---|---|
| `app/page.tsx` | 내부 ERP 메인 화면과 대시보드/유입/매출 화면 조합 | 매우 큰 파일. 동시에 여러 작업자가 수정하지 않는다. |
| `components/stores/store-info-page.tsx` | 매장 정보, 비공개 정보, 파일 업로드, 세팅 UI | 일부 localStorage 기능이 남아 있다. |
| `components/stores/store-registry-context.tsx` | 매장 목록 조회/선택/URL `storeId` 상태 | 등록 후 목록 갱신의 핵심 위치다. |
| `components/daily-tasks/` | 관리자/일일 업무 UI | DB 이전 전까지는 예시/브라우저 상태가 섞여 있다. |
| `app/api/erp/stores/` | 매장 CRUD, private profile, setup, identifier API | 모든 새 데이터는 `store_id` 검증을 거친다. |
| `app/api/erp/place-uploads/route.ts` | 네이버 CSV/JSON 기간 조회와 CSV 적재 | CSV child rows와 JSON raw registry의 read model을 주의한다. |
| `app/api/erp/naver-json-uploads/route.ts` | 네이버 JSON raw 업로드 | Raw → Snapshot → Fact 완성 전이다. |
| `app/api/erp/card-uploads/route.ts` | 여신금융 파일 업로드/조회 | 승인·취소·실제 0/누락을 구분한다. |
| `app/api/erp/dashboard/route.ts` | 운영 대시보드 집계 | 상세 화면과 같은 기간/집계 규칙으로 유지한다. |
| `lib/credit-finance/parser.ts` | 여신금융 XLS 파서 | fixture로 승인/취소/중복을 검증한다. |
| `lib/place-csv/parser.ts` | 네이버 CSV 파서 | 지원·부분지원·미지원 모듈 의미를 보존한다. |
| `lib/analytics/time-buckets.ts` | 일/주/월 bucket 계산 | 날짜 범위 비교의 단일 기준 후보다. |
| `lib/stores/registry.ts` | Canonical Store 타입과 입력 검증 | `erp_stores.id`를 바꾸지 않는다. |
| `lib/stores/organization.ts` | 최초 organization 보장 | 2026-08-03 미커밋 파일. 먼저 검증한다. |
| `lib/auth/` | 세션/권한/audit 경계 | 외부 공개 페이지와 내부 API를 구분한다. |
| `app/store/[mid]/` | 사장님 공개 보고서·정보안내문 | 비공개 정보를 절대 포함하지 않는다. |
| `supabase/migrations/` | 확장형 DB migration | destructive migration 금지. |
| `supabase/rollbacks/` | migration rollback | migration 추가 시 함께 작성한다. |
| `tests/` | Node test fixtures/contracts | parser나 계산을 바꾸면 fixture 테스트를 추가한다. |
| `.env.example` | 필요한 환경변수 이름 | 실제 값은 절대 커밋하지 않는다. |

