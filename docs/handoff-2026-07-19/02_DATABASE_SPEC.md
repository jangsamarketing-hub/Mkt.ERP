# 데이터베이스 규격

## 1. 설계 원칙

- 모든 운영 데이터의 공통키는 `store_id`다.
- 원본 파일, 정규화 행, 분석 결과, 보고서 스냅샷을 분리한다.
- 업로드되지 않은 기간은 `0`이 아니라 `NULL/데이터 없음`이다.
- 재업로드는 덮어쓰지 않고 버전을 남기며 `is_current`로 최신본을 지정한다.
- 외부 비밀번호/API 비밀키는 전용 암호화 계층에 저장한다.
- 중요한 변경은 `actor_id`, `created_at`, `updated_at`, 변경 로그를 남긴다.

## 2. 현재 코드에서 확인되는 Supabase 구조

### 매장

#### `erp_stores`

매장 공통 원장. 현재 매장 목록 API와 업로드의 기준 테이블이다.

핵심 필드:

- `id uuid primary key`
- `name text`
- `client_name text`
- `mid text`
- `manager_name text`
- `industry text`
- `region text`
- `management_start_date date`
- `management_weeks integer`
- `created_at`, `updated_at`

### 네이버 플레이스 주간 CSV

#### `erp_place_csv_uploads`

- `id`, `store_id`
- 원본 파일명, Storage 경로, SHA-256
- `period_start`, `period_end`
- `parser_version`, `status`, `warnings`
- 요약 JSON
- `revision`, `is_current`

#### 정규화 행

- `erp_place_keyword_rows`: 유입 키워드와 유입수
- `erp_place_channel_rows`: 유입 채널과 유입수
- `erp_place_time_rows`: 시간대별 유입
- `erp_place_weekday_rows`: 요일별 유입

조회 시 `store_id + period + is_current=true`를 사용한다.

### 여신금융 승인내역

#### `erp_card_imports`

- `id`, `store_id`
- 원본 파일명, Storage 경로, SHA-256
- 기간, 파서 버전, 행 수, 상태, 경고
- `revision`, `is_current`

#### `erp_card_transactions`

정규화된 승인/취소 원장.

- 거래일시
- 카드사
- 마스킹 카드번호
- 승인번호
- 승인금액
- 승인/취소 구분
- 원거래 연결키 또는 정규화 거래키
- 원본 import 참조

#### 집계 뷰

- `erp_card_daily_summary`: 날짜별 순매출, 순결제건, 결제 1건당 금액
- `erp_card_hourly_summary`: 시간대별 순매출, 순결제건

> 이 집계는 고객 수가 아니라 결제 전표/거래 기준이다. 마스킹 카드번호만으로 실제 신규·재방문 고객을 확정하지 않는다.

### Storage

- 버킷: `erp-private-uploads`
- 비공개
- 용도: 플레이스 CSV, 여신금융 XLS/XLSX 원본
- 제한: 약 10MB, 허용 MIME/확장자 검증

## 3. 현재 API

| 경로 | 역할 | 상태 |
|---|---|---|
| `/api/erp/stores` | 매장 조회/추가 | 부분 구현 |
| `/api/erp/dashboard` | 매장 + 최근 플레이스 유입 조회 | 실제 DB 조회, 지표 범위 제한 |
| `/api/erp/place-uploads` | CSV 업로드/조회 | 실제 Storage/DB 저장 |
| `/api/erp/card-uploads` | XLS 업로드/조회 | 실제 Storage/DB 저장 |
| `/api/naver-searchad/keyword-volume` | 검색량 조회 | API 경로 구현, 계정/오류 검증 필요 |
| `/api/naver-map/page-count` | 지도 페이지 수 확인 | 서버 요청 차단으로 신뢰 불가 |

## 4. 반드시 추가할 목표 테이블

### 조직과 권한

- `organizations`
- `profiles`
- `organization_members`
- `store_members`
- `roles` 또는 enum: admin, manager, owner, store_staff

### 매장 상세

- `store_profiles`
- `store_external_accounts`
- `store_links`
- `store_internal_notes`
- `store_sales_histories`
- `store_personas`: 재계약 감도, 성향, 핵심 니즈, 핵심 불안

### 업무

- `task_templates`
- `tasks`
- `task_evidence`
- `task_status_logs`
- `weekly_work_cycles`
- `weekly_work_items`
- `manager_daily_templates`
- `manager_daily_runs`
- `manager_daily_items`
- `call_histories`
- `call_task_candidates`

### 매장 세팅과 월별 이력

- `setup_item_templates`
- `store_setup_cycles`: `store_id + year_month`
- `store_setup_items`: 진행률, 마감일, 완료 여부
- `store_setup_evidence`: 비포/애프터 사진, 촬영일
- `store_marketing_channels`: 네이버/당근/인스타/구글 광고 여부
- `store_activity_history`: 전문사진, 먹플루언서 등 날짜 이력

### 정보안내문과 보고서

- `questionnaire_templates`
- `questionnaire_sections`
- `questionnaire_questions`
- `questionnaire_submissions`
- `questionnaire_answers`
- `report_snapshots`
- `report_share_tokens`

### 키워드와 광고

- `keyword_projects`
- `keyword_groups`
- `keyword_combinations`
- `keyword_analysis_jobs`
- `keyword_analysis_results`
- `store_registered_keywords`
- `searchad_accounts`
- `searchad_balance_snapshots`
- `searchad_daily_stats`
- `ad_change_drafts`
- `ad_change_approvals`
- `ad_change_logs`

### CRM/일마감

- `customer_consents`
- `customer_contacts`
- `qr_event_participations`
- `owner_missions`
- `daily_closings`
- `daily_closing_expenses`

## 5. 관계 규격

```text
organizations
  └─ stores
      ├─ place uploads ─ normalized place rows
      ├─ card imports ─ card transactions ─ summary views
      ├─ tasks ─ evidence/status logs
      ├─ setup cycles ─ setup items ─ evidence
      ├─ questionnaire submissions ─ answers
      ├─ keyword projects ─ combinations ─ analysis results
      ├─ searchad accounts ─ balance/stats/change logs
      ├─ reports ─ share tokens
      └─ CRM + daily closings
```

## 6. RLS 권한

- 관리자: 조직 내 모든 매장 읽기/쓰기
- 매니저: 배정된 매장 읽기/쓰기
- 사장님: 자기 매장 읽기, 허용된 미션/일마감만 쓰기
- 매장 직원: 자기 매장의 제한된 입력만 쓰기
- 공유 보고서: 만료 가능한 토큰으로 승인된 스냅샷만 읽기
- QR 고객: 공개 이벤트 설정 읽기, 자기 참여/동의만 생성

## 7. 데이터 마이그레이션 순서

1. 조직/사용자/매장 RLS
2. 현재 `erp_stores` 정리와 임시 테스트 매장 제거
3. 브라우저 업무/통화/매장 체크를 DB 테이블로 이전
4. 플레이스/카드 원장의 `store_id` 무결성 확인
5. 분석 스냅샷과 대시보드 API 통합
6. 보고서 스냅샷과 공유 토큰
7. 광고 조회/추천/승인 로그

