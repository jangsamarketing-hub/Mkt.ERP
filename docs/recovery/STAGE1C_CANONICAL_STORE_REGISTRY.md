# Stage 1C Canonical Store Registry

작성일: 2026-07-19

브랜치: `recovery/stage-1c-store-registry`

상태: 로컬 구현·검증 완료, 원격 DB 미적용, 배포 안 함

## 1. 목표와 보존 원칙

- 원격 `erp_stores`의 기존 6개 행과 각 `id`를 그대로 보존한다.
- 플레이스, 여신금융, 향후 광고·업무·보고서가 같은 `store_id`를 사용한다.
- 매장은 물리 삭제하지 않고 `active`, `paused`, `archived`로 상태를 관리한다.
- 실제 매장, 샘플 매장, 테스트 매장을 `environment`로 구분한다.
- 기존 `naver_mid`는 지우지 않고 외부 식별자 원장에 복제해 호환 기간을 둔다.

## 2. 추가한 데이터 구조

| 구조 | 역할 |
|---|---|
| `organizations` | 맞춤장사 OS 운영 조직 |
| `profiles` | 향후 Supabase Auth와 연결할 사용자 프로필 |
| `organization_members` | 조직 단위 역할 |
| `store_members` | 담당 매장 단위 역할 |
| `erp_stores.organization_id` | 기존 매장 원장을 조직에 연결 |
| `lifecycle_status` | 활성·일시중지·보관 구분 |
| `environment` | 실제·샘플·테스트 구분 |
| `management_start_date` | 관리 시작일과 관리 주차 계산 기준 |
| `manager_profile_id` | 향후 담당자 프로필 연결 |
| `store_external_identifiers` | Place MID/ID, SearchAd Customer ID, 여신 가맹점 그룹·MID |

## 3. migration 순서

1. `202607190005_canonical_store_registry_schema.sql`: nullable 확장 구조와 인덱스 생성
2. `202607190006_canonical_store_registry_backfill.sql`: 기본 조직 연결, 관리 시작일, 기존 MID 복제
3. 읽기 전용 검증 SQL 실행: 모든 `issue_count`와 `orphan_store_ids`가 0인지 확인
4. `202607190007_canonical_store_registry_constraints.sql`: `organization_id not null` 확정

DDL과 기존 행 backfill을 분리했다. 아직 어느 파일도 원격 ERP Supabase에 적용하지 않았다.

## 4. 애플리케이션 연결

- `/api/erp/stores`: 활성/일시중지 매장 조회와 신규 등록
- `/api/erp/stores/[storeId]`: 단일 조회, 수정, 보관·복원. 물리 DELETE는 405로 차단
- `/api/erp/stores/[storeId]/external-identifiers`: 외부 식별자 조회·등록
- 공통 Store Registry Context: 선택 매장을 URL `storeId`와 동기화
- 공통 선택값 연결: 유입/키워드, 여신금융, 일일업무, 매장정보, 정보안내문
- 엑셀 업체등록과 매장정보 저장은 localStorage가 아니라 매장 원장 API를 사용

현재 업무 내용·통화·세부 매장 프로필 일부는 여전히 localStorage 샘플이다. 이 단계에서는 매장 목록의 기준만 DB로 전환했고, 업무 전체 이관은 후속 단계 범위다.

## 5. 권한 경계

- 브라우저는 신규 원장 테이블에 직접 접근하지 않는다.
- 신규 테이블은 RLS를 켜고 `anon`, `authenticated` 직접 권한을 회수했다.
- 현재 고정 관리자 세션은 서버 API를 통해서만 service role을 사용한다.
- 직원·사장님 계정 도입 시 `profiles`, `organization_members`, `store_members`를 현재 `canAccessStore` 경계에 연결한다.

## 6. 검증 결과

- 단위/회귀 테스트: 21개 통과
- TypeScript: 통과
- 프로덕션 빌드: 통과
- 비밀값 검사: 통과
- ESLint: 오류 0개, 기존 경고 포함 22개
- 원격 DB 변경: 0건
- 배포: 하지 않음

Stage 0 원격 감사에서 기존 ERP 연관 테이블의 고아 `store_id`는 0건이었다. 새 migration 적용 뒤에는 `supabase/verification/202607190005_canonical_store_registry_checks.sql`을 다시 실행해야 Stage 1C 원격 Gate를 통과한다.

## 7. 위험과 롤백

### 위험

- 로컬 저장소에 원격 최초 core migration이 없어서 전체 schema 재현이 아직 완전하지 않다.
- 원격에 005~007을 적용하기 전에는 신규 등록·보관 API가 새 컬럼/테이블을 찾지 못한다.
- 외부 식별자 대표값 교체는 API 요청 중간 실패 시 재시도가 필요할 수 있어, 실제 광고계정 연결 전 DB 함수 기반 원자 처리로 보강한다.
- localStorage 업무 샘플의 `s1` 같은 ID는 실제 UUID 원장과 다르며 운영 데이터로 취급하면 안 된다.

### 롤백

1. 적용 전 schema-only dump와 `erp_stores`, 외부 식별자 백업을 만든다.
2. 문제 발생 시 애플리케이션을 Stage 1B 커밋으로 되돌린다.
3. 새 구조는 기존 컬럼을 삭제하거나 기존 `id`를 변경하지 않으므로, 애플리케이션 롤백 후에도 기존 Place/여신 기능은 유지된다.
4. DB 구조 제거가 꼭 필요할 때만 대표 승인 후 `supabase/rollbacks/202607190005_canonical_store_registry.down.sql`을 검토 실행한다.

## 8. 2026-07-19 원격 사전점검 결과

- ERP Supabase `iutsvjtrklasrmjukkie`의 migration 이력은 기존 core, Place 주간 적재, 여신금융 원장까지 5개이며, Stage 1C의 005~007은 아직 적용되지 않았다.
- 실제 `erp_stores`는 6개 행이며 기존 `id`, `contract_start_date`, `naver_mid`, `updated_at` 컬럼이 migration 전제와 일치한다.
- 신규 원장 테이블(`organizations`, `profiles`, `organization_members`, `store_members`, `store_external_identifiers`)은 아직 없어 이름 충돌이 없다.
- Place 업로드·행 테이블, 여신금융 import·transaction, 키워드 테이블의 고아 `store_id`는 모두 0건이다.
- `erp_stores`에 사용자 trigger가 없어 Stage 1C의 `updated_at` trigger 추가와 충돌하지 않는다.
- 보안 advisor에는 기존 테이블의 RLS policy 부재와 기존 카드 집계 view 2건의 SECURITY DEFINER 경고가 남아 있다. 이번 migration은 새 테이블에 RLS를 켜고 브라우저 역할의 직접 권한을 회수하므로 해당 기존 경고를 확대하지 않는다. 기존 view 정리는 별도 보안 정비 작업으로 분리한다.

## 9. 대표 승인 전 남은 Gate

1. schema dump를 확보한 임시 DB에서 005 → 006 → 검증 → 007 순서 리허설
2. 실제 6개 매장의 `production/sample/test` 분류 확정
3. 기본 조직명과 담당자 프로필 생성 기준 확정
4. 원격 적용 승인
