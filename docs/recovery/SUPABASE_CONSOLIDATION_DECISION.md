# Supabase 통합 결정

## 결정

ERP 프로젝트 `iutsvjtrklasrmjukkie`를 맞춤장사 OS의 유일한 canonical 운영 DB로 유지한다.

검색광고 개발 프로젝트 `udaxbwmkohnfsyyjukoj`는 현재 권한 때문에 감사할 수 없으므로 운영 DB, staging DB 또는 이중 원장으로 사용하지 않는다. 권한 확보 후 read-only로 감사하고 재사용 가능한 schema와 코드만 선별한다.

## 이유

- ERP 프로젝트에 매장 6개와 Place·여신금융 실데이터가 이미 있다.
- 모든 운영 데이터의 기준 키는 한 개의 `store_id`여야 한다.
- 두 프로젝트를 런타임 join하면 권한, 장애, migration, 백업, 감사로그가 분리된다.
- 검색광고는 추천·승인·실행·검증·원복 기록까지 ERP의 매장·계약·담당자와 함께 남아야 한다.

## 목표 역할

| 영역 | ERP 프로젝트 | 검색광고 개발 프로젝트 |
|---|---|---|
| 매장 원장 | canonical | 금지 |
| Place/여신 원장 | canonical | 금지 |
| 사용자·권한 | canonical | 금지 |
| 광고 read snapshot | canonical로 이관 | 감사 전 임시 참고만 |
| 광고 draft/approval/execution log | canonical | 금지 |
| 실험 | 별도 preview/local 권장 | 감사 후 폐기 또는 제한적 sandbox |

## 통합 순서

1. 두 프로젝트의 schema, migration, grants, RLS, functions, Storage를 읽기 전용 감사한다.
2. 검색광고 데이터에서 secret을 제외하고 account/campaign/entity 식별자와 store 매핑 후보를 export한다.
3. ERP에 `ad_accounts`, snapshot, draft, approval, execution log schema를 forward migration으로 추가한다.
4. dry-run import와 row count/checksum/store mapping 결과를 검토한다.
5. ERP read-only 화면을 canary로 비교한다.
6. 일치 확인 후 ERP를 유일한 read/write 대상로 전환한다.
7. 기존 개발 프로젝트는 일정 기간 read-only 보관 후 대표 승인으로 정리한다.

## 금지 사항

- 브라우저에서 두 Supabase를 동시에 직접 호출
- 개발 프로젝트를 운영 staging으로 간주
- secret 또는 평문 비밀번호 migration
- store 매핑이 없는 광고 계정 자동 연결
- 감사 전에 개발 프로젝트 삭제
- 자동입찰을 통합 검증 수단으로 사용

## 롤백

- 통합은 원본 프로젝트를 변경하지 않는 copy-first 방식으로 시작한다.
- ERP 신규 테이블은 기존 화면에서 참조하지 않는 expand migration으로 추가한다.
- read pointer 전환 전까지 기존 검색광고 조회 경로를 유지한다.
- 전환 후 오류가 나면 feature flag/read pointer를 이전 경로로 되돌리고 신규 write를 중지한다.

## 미해결 Gate

- 검색광고 개발 프로젝트 read 권한
- 데이터와 코드의 실제 소유 범위
- 운영에 필요한 광고 계정 수와 매장별 Customer ID 확정
- 기존 secret의 노출 가능성 확인 및 필요 시 회전

