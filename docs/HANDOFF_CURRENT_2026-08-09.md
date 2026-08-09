# 장사 ERP / 맞춤장사 OS - 현재 인수인계 및 Claude 검수 요청서

작성일: 2026-08-09 (Asia/Seoul)  
저장소: `jangsamarketing-hub/Mkt.ERP`  
현재 작업 브랜치: `feat/daily-task-command-center`  
안전 보관 브랜치: `backup/pre-daily-task-dashboard-20260809`  
직전 안정 커밋: `988485d feat: save weekly work evidence`  
배포 별칭: `https://mkt-erp.vercel.app`

> 이 문서는 다음 Codex/Claude가 현재 코드를 버리지 않고 검수·개발을 이어가기 위한 기준이다. 비밀값, API Secret, 서비스 역할 키는 문서/커밋/채팅에 넣지 않는다.

## 1. 제품 의도와 현재 방향 평가

제품은 범용 마케팅 SaaS가 아니라, 음식점 마케팅 대행사가 여러 매장을 **같은 `store_id` 기준으로 관리하고**, 직원이 한 업무를 사장님이 공개 링크에서 확인하는 운영 시스템이다.

핵심 가치 흐름은 아래와 같다.

```mermaid
flowchart LR
  A["매장 등록: 단일 store_id"] --> B["데이터 적재: 네이버 JSON/CSV · 여신 XLS/XLSX · 검색광고 읽기"]
  B --> C["내부 운영: 위험 신호 · 목표 지표 · 오늘 업무"]
  C --> D["매니저가 업무 증빙 기록"]
  D --> E["사장님 공개 보고서: 업무/매출/유입 확인"]
  B --> F["목표 분석: 고객수 · 객단가 · 재방문 · 테이블 회전"]
  F --> C
```

현재 방향은 최초 의도와 대체로 맞다. 특히 데이터 원장을 먼저 만들고, 실제 파일 업로드 → 기간 조회 → 운영 화면으로 연결한 점은 맞는 순서다. 다만 **업무 원장의 계약 사이클·매니저 권한·증빙 저장**이 아직 완결되지 않아, 지금은 이 부분을 최우선으로 마무리해야 한다. 새 광고 자동화, 순위 추적, QR CRM은 그 뒤 단계다.

## 2. 실제 구현된 것

| 영역 | 상태 | 구현 위치/비고 |
|---|---|---|
| 매장 원장 | 구현 | `erp_stores` + `components/stores/store-registry-context.tsx`; 화면 선택은 `storeId`를 중심으로 유지 |
| 매장 기본/비공개 정보 | 구현 | `components/stores/store-info-page.tsx`, private profile·사업자 등록·외부 계정 API |
| 네이버 플레이스 업로드 | 구현 | JSON/CSV 원본 등록, 기간 기준 조회, 유입/키워드/채널 집계 |
| 여신금융 업로드 | 구현 | XLS/XLSX 파싱, 원본/거래/일·시간 집계, 기간 조회 |
| 과거 장사 ERP 매출 이관 | 검증/미리보기 중심 | `/admin/imports/jangsadoctor`, 실제 매장 자동 병합은 하지 않음 |
| 검색광고 읽기 전용 | 구현 | 매장별 Customer ID/Access License/Secret, bizmoney·노출·클릭·CPC·캠페인 snapshot |
| 검색광고 잔액 경고 | 구현 | 잔액은 정수 원 단위, 10만원 이하는 빨간색 |
| 공개 사장님 링크 | 구현 | `/store/[mid]/report`, `/store/[mid]/daylist`, `/store/[mid]/info`, `/store/[mid]/infor` |
| 업무 증빙 기록 | 방금 구현 | `주간 업무`에서 매장별 업무 선택 → 메모/증빙 링크 저장 → 자동 `기입완료` → 공개 보고서 읽기 전용 표시 |
| 목표 매출 계산 | 1차 구현 | 매출·고객수·객단가·재방문률·테이블 수·CAC 입력/계산. 카드 마스킹 식별은 내부 참고 지표 |

### 최근 커밋 흐름

- `79a8abd` 공용 템플릿과 매장 업무 원장 추가
- `9dcfc73` 매장별 credential vault·공개 업무 보고서 연결
- `60282e9` 매장 계정/사업자 비공개 정보 저장
- `332c9c2` 검색광고 Bizmoney 조회 수정
- `781b614` 카드 기반 선행지표·대시보드 잔액 연결
- `88a17ee` 잔액 소수점 제거·저잔액 빨간 강조
- `988485d` 주간 업무 메모/증빙 링크 저장 및 자동 기입완료

## 3. 데이터베이스 원장과 화면 연결

모든 운영 데이터의 기준은 `erp_stores.id` (`store_id`)이다. 매장명을 기준으로 자동 병합하지 않는다.

| 원장 | 핵심 테이블 | 데이터가 들어오는 방식 | 소비 화면 |
|---|---|---|---|
| 매장/권한 | `erp_stores`, `organizations`, `profiles`, `store_members`, `store_external_identifiers` | 매장 등록/수정 | 전체 선택기, 운영 대시보드, 매장 정보 |
| 네이버 원본/분석 | `erp_naver_place_json_imports`, `erp_place_*` | 주간 JSON 우선, 월간은 최초 이력/보고서용, CSV 호환 | 유입/키워드, 운영 대시보드, 공개 보고서 |
| 카드 매출 | `erp_card_imports`, `erp_card_transactions`, `erp_card_daily_summary`, `erp_card_hourly_summary` | 여신 XLS/XLSX 업로드 | 여신금융 매출, 목표 계산, 운영 대시보드 |
| 검색광고 | `erp_searchad_sync_configs`, `erp_searchad_account_snapshots`, `erp_searchad_campaign_daily_stats` | 읽기 전용 API 수집 | 네이버 광고, 운영 대시보드 비즈머니 |
| 매장 설정/계약 준비 | `erp_store_setup_months`, `erp_store_setup_items`, `erp_store_goal_settings` | 매장 정보 화면 | 매장 설정, 목표 분석 |
| 업무/사장님 공유 | `erp_store_work_updates`, `erp_admin_templates`, `erp_store_information_submissions` | 매니저 메모/증빙과 사장님 입력 | 주간/일일 업무, 공개 보고서, 정보안내문 |
| 비공개 계정/사업자 정보 | `erp_store_private_profiles`, `erp_store_external_credentials`, `erp_searchad_store_credentials` | 관리자 화면에서 저장 | 매장 정보 내부 화면만 |

### 데이터 품질 원칙

- `데이터 없음`, `미수집`, `부분수집`, `실제 0`을 같은 값으로 처리하지 않는다.
- 네이버 주간 원본은 주간 단위로 적재한다. 월간 원본은 주간으로 임의 분할하지 않는다.
- 같은 기간의 JSON과 CSV는 합산하지 않는다. 원본 우선순위/버전 기준으로 하나만 조회한다.
- 카드 마스킹 값은 신규/재방문 **확정 고객 식별값이 아니다**. 내부 추세 지표로만 사용한다.
- 광고는 현재 조회/저장 전용이다. 캠페인 생성·입찰 변경은 아직 금지한다.

## 4. 현재 아키텍처와 주요 코드 지도

| 목적 | 파일 |
|---|---|
| 내부 단일 페이지 UI/대시보드/광고/유입/매출/주간 업무 | `app/page.tsx` |
| 매장 선택 및 URL 상태 | `components/stores/store-registry-context.tsx` |
| 매장 정보/계정/설정/업무 템플릿 | `components/stores/store-info-page.tsx` |
| 업무 기록 API | `app/api/erp/stores/[storeId]/work-updates/route.ts` |
| 공개 업무 리스트 | `components/public-store-work-list.tsx` |
| 사장님 공개 일일 보고서 | `app/store/[mid]/daylist/page.tsx` |
| 검색광고 API 수집 | `lib/naver-searchad/read-only.ts`, `lib/naver-searchad/sync.ts` |
| 검색광고 snapshot API | `app/api/erp/searchad/*` |
| 여신 파서 | `lib/credit-finance/parser.ts`, `app/api/erp/card-uploads/route.ts` |
| 네이버 파서/업로드 | `lib/place-csv/parser.ts`, `app/api/erp/place-uploads/route.ts`, `app/api/erp/naver-json-uploads/route.ts` |
| DB 변경 | `supabase/migrations/` |

## 5. 지금 진행 중인 단계

### Stage 0~1: 기준선/매장 원장

완료 또는 운영 가능한 수준이다. 원격 스키마와 저장소 migration의 일부 차이는 과거 환경 설정 문제로 남아 있으므로, 다음 DB 변경 전에는 반드시 원격 migration 상태를 확인한다.

### Stage 2~4: 반자동 데이터 적재·조회

네이버 주간 JSON/CSV와 여신 XLS/XLSX 업로드 및 기간 조회는 구현됐다. 중복 기간 표시·삭제·다중 업로드 UI는 아직 보강 필요하다.

### Stage 5: 운영 대시보드

부분 구현이다. 매출/네이버/비즈머니 신호는 연결되기 시작했지만, 매장별 업무·소통 신호와 담당자 범위가 아직 부족하다.

### Stage 6: 업무 원장과 사장님 가치 전달

진행 중이다. 메모·증빙 저장은 추가되었으나, 오늘 업무 대시보드, 계약 4주 사이클, 매니저 범위, 사진 첨부가 남았다.

## 6. 다음 작업: 일일 업무 커맨드 센터

새 브랜치 `feat/daily-task-command-center`에서 아래 순서로 구현한다.

1. `erp_store_work_updates`를 날짜 기준으로 조회하는 `오늘 업무` API/화면을 만든다.
2. 기본 날짜는 한국 시간 오늘로 하고, 관리자만 담당자/매장 필터를 본다.
3. 매니저는 자신에게 배정된 매장만 본다. 임시로 이름 필터를 쓰지 말고 `store_members`/profile을 기준으로 만든다.
4. 업무는 **수동 완료 버튼 없이**, 메모·링크·사진 중 하나가 저장되면 `기입완료`; 없으면 `미기입`; 날짜가 지난 뒤 미기입이면 `업무 누락`으로 계산한다.
5. 매장별 오늘 업무 진행률과 미기입 매장 목록을 상단에 표시한다.
6. 업무 클릭 시 기존 `work-updates` 상세/저장 화면으로 이동하거나 우측 상세 패널을 연다.
7. 공개 보고서는 회사가 기록한 메모/첨부만 읽기 전용으로 표시한다.

### 계약 사이클 결정 (확정)

- 관리 시작일 기준 28일 = 1 사이클(1~4주차).
- 재계약이 확정되면 다음 28일 업무 묶음을 생성한다.
- 재계약이 없으면 매장을 일시정지하고 새 업무는 생성/노출하지 않는다.
- 과거 사이클의 업무와 증빙은 절대 삭제하지 않는다.

이 구조는 기존 `erp_store_work_updates.task_week`만으로는 부족하다. 다음 migration에서 `erp_store_contract_cycles` 또는 동등한 계약 사이클 원장을 추가하고, `erp_store_work_updates.contract_cycle_id`로 연결해야 한다.

## 7. Claude 코드 검수 요청 사항

아래를 우선순위대로 검수해 달라고 요청한다.

1. `store-info-page.tsx`의 `syncStoreTasks`가 기존 업무를 전부 DELETE한 후 다시 만드는 구조인지 확인. 그렇다면 이미 작성한 증빙이 삭제되므로 즉시 변경 필요.
2. 업무 업데이트 PATCH가 메모/증빙을 빈 값으로 덮어쓰는 경로가 없는지 확인.
3. 공개 페이지가 사장님에게 비공개 정보(계정/사업자/내부 메모)를 노출하지 않는지 확인.
4. `erp_store_work_updates`에 계약 사이클 FK를 추가하는 migration과 롤백 SQL을 제안.
5. 매니저 범위가 UI 필터가 아니라 서버 API 권한으로 강제되는지 확인.
6. 카드 신규/재방문 지표가 마스킹 카드 식별 기반의 내부 참고치로만 표시되는지 확인.
7. 업로드 기간 중복 시 합산되지 않는지, 원본 삭제가 transaction cascade와 함께 안전하게 되는지 확인.
8. 검색광고 호출이 읽기 전용인지, Secret이 브라우저/로그/공개 링크에 노출되지 않는지 확인.

## 8. 아직 하지 말 것

- 검색광고 캠페인 생성, CPC 자동 조정, 30분 단위 입찰 변경
- 네이버/여신 사이트 자동 로그인 및 자동 수집 확장
- 목표 키워드 순위 자동 크롤링
- 결제/Toss Payments, QR CRM 게임, OCR, 대량 신규 화면

위 기능은 업무 원장과 데이터 품질이 안정된 뒤 작은 승인형 단계로 진행한다.

## 9. 운영/검증 절차

```powershell
npm install
npm run build
git status --short
```

테스트 시에는 다음을 확인한다.

1. 새 매장 저장 후 선택기에 즉시 표시되는가.
2. 해당 매장에 네이버/여신 파일을 올리면 다른 매장과 섞이지 않는가.
3. 매니저가 업무 메모를 저장하면 공개 `/store/[mid]/report` 또는 `/daylist`에서 `기입완료`와 내용이 보이는가.
4. 매장 정보 수정 후 과거 업무 증빙이 사라지지 않는가.
5. 공개 링크에서 계정 비밀번호·사업자 정보·내부 메모가 보이지 않는가.

## 10. 작업 원칙

- 모든 DB 변경은 migration + rollback + build 검증 후 커밋한다.
- 작은 기능 하나당 별도 브랜치/커밋으로 만든다.
- `supabase/.temp/`와 추적되지 않은 과거 bootstrap migration은 사용자의 파일이므로 임의로 추가/삭제하지 않는다.
- 배포 전에는 공개 페이지와 관리자 페이지를 각각 확인한다.

## 11. 현재 브랜치의 다음 원장 초안

- `supabase/migrations/20260809110000_store_contract_cycles_draft.sql`
  - 관리 계약을 28일 단위 `erp_store_contract_cycles`로 보존한다.
  - 재계약은 이전 주기를 덮어쓰지 않고 다음 cycle을 추가한다.
  - `erp_store_work_updates.contract_cycle_id`로 업무 증빙을 계약 주기에 귀속한다.
  - 초안 migration이므로 원격 Supabase schema 비교와 백업 후에만 적용한다.

## 12. 일일업무 화면 전환 상태

- `components/daily-tasks/daily-tasks-page.tsx`는 기존 localStorage 업무함을 제거하고 `erp_store_work_updates` 조회/기입 화면으로 교체했다.
- 선택 날짜에 예정된 회사 업무를 매장별로 묶어 보여주며, 메모 또는 증빙 링크 저장 시 자동 `기입완료`가 된다.
- 현 단계는 관리자 전체 조회다. 담당 매니저별 서버 권한 제한과 4주 cycle 자동 생성은 다음 구현 단위다.
