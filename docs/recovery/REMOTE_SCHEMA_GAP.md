# 원격 Supabase 스키마 차이 감사

## 1. ERP 프로젝트 실측

프로젝트 `iutsvjtrklasrmjukkie`의 `public` schema를 2026-07-19에 읽기 전용으로 확인했다.

| 테이블 | row |
|---|---:|
| `drive_sources` | 1 |
| `drive_files` | 3 |
| `call_recordings` | 2 |
| `processing_jobs` | 51 |
| `erp_stores` | 6 |
| `erp_place_csv_uploads` | 5 |
| `erp_place_keyword_rows` | 1,800 |
| `erp_place_channel_rows` | 44 |
| `erp_place_time_rows` | 92 |
| `erp_place_weekday_rows` | 28 |
| `erp_sales_uploads` | 0 |
| `erp_keyword_jobs` | 0 |
| `erp_keyword_results` | 0 |
| `erp_card_imports` | 1 |
| `erp_card_transactions` | 1,457 |

views:

- `erp_card_daily_summary`
- `erp_card_hourly_summary`

Storage:

- private bucket `erp-private-uploads`
- 제한 10MB
- 허용 MIME: CSV, plain text, XLS
- JSON과 XLSX는 현재 허용되지 않음

Edge Function은 없다.

## 2. migration history 차이

### 원격 적용 이력

1. `20260717190454 create_erp_core_data_tables`
2. `20260718094353 place_weekly_ingestion`
3. `20260718102313 place_ingestion_hardening`
4. `20260718132237 credit_finance_ledger`
5. `20260718132633 card_time_summary`

### 저장소 파일

1. `202607180001_place_weekly_ingestion.sql`
2. `202607180002_place_ingestion_hardening.sql`
3. `202607180003_credit_finance_ledger.sql`
4. `202607180004_card_time_summary.sql`

### 판정

- 원격 `create_erp_core_data_tables` migration이 저장소에 없다.
- 동일 기능 migration도 원격 적용 version과 로컬 파일 version이 다르다.
- 현재 파일을 그대로 재적용하거나 migration history를 임의 수정하면 안 된다.
- 먼저 `supabase db dump` 또는 동등한 schema-only dump를 확보하고, 원격 history와 SQL을 대조한 baseline 초안을 별도 PR에서 만든다.

권장 명령은 Supabase 공식 migration workflow를 따른다. 원격 연결 전 비밀값은 shell history와 문서에 남기지 않는다.

## 3. 보안 경계 차이

- 15개 public table 모두 RLS enabled
- `pg_policies`에서 policy 0개
- anon/authenticated/service_role에 광범위한 table/view grants가 존재
- 현재 API route는 service-role client를 사용하므로 RLS보다 서버 route의 세션·역할·store 범위 검사가 핵심이다.
- 카드 일별·시간대별 view는 Supabase Security Advisor에서 security-definer error로 감지됐다.

참고:

- [security definer view 경고](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [RLS enabled no policy 안내](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

Stage 1 순서는 `Auth/API boundary -> RLS/grant 검증 -> store CRUD`다. 새 public table은 RLS뿐 아니라 Data API grant를 명시적으로 설계한다.

## 4. 무결성과 성능

- 확인한 ERP 연관 테이블의 고아 `store_id`: 0건
- `erp_keyword_jobs.store_id`와 `processing_jobs`의 일부 Drive FK에 covering index가 없다는 advisor 경고가 있다.
- unused index 정보는 현재 데이터 규모만으로 삭제 근거가 되지 않으므로 보존한다.
- `set_updated_at` routine은 security invoker이며, update trigger는 Drive/통화/처리 테이블에만 확인됐다.

## 5. 검색광고 개발 프로젝트

프로젝트 `udaxbwmkohnfsyyjukoj`는 table 및 migration 조회가 permission denied로 실패했다. 따라서 아래 항목은 미확인이다.

- 실제 table/view/function/trigger
- RLS, grants, policies
- Storage와 Edge Functions
- migration history
- 저장된 계정/캠페인 데이터의 store 매핑 상태

이 프로젝트를 ERP staging DB로 사용하지 않는다. 권한 확보 후 read-only 감사를 먼저 하고, 필요한 데이터만 ERP canonical schema로 migration한다.

## 6. schema dump 절차

1. Supabase CLI 버전과 프로젝트 link 대상을 기록한다.
2. ERP 프로젝트의 schema-only dump를 암호화된 로컬 작업 디렉터리에 생성한다.
3. `auth`, `storage`, `public`의 grants, policies, functions, triggers, views를 별도 확인한다.
4. 원격 migration history와 저장소 SQL checksum을 비교한다.
5. 누락 core migration 재구성본을 새 파일로 만들되 원격에는 적용하지 않는다.
6. 대표 승인 후에만 신규 migration 번호로 forward migration한다.

원격 DB의 migration history table을 수동으로 맞추는 방식은 사용하지 않는다.

