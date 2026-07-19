# 매장 분류 확인표

현재 schema에는 실제/샘플/교육 매장을 구분하는 flag가 없다. 데이터 존재 여부만으로 운영 매장 여부를 추정하지 않고 모두 대표 확인 대상으로 둔다.

| 매장 | 담당자 | 계약 시작 | Place 업로드 | 여신 import | 현재 판정 |
|---|---|---|---:|---:|---|
| 곱창파는 고깃집 공덕본점 | 강정원 | 2026-07-06 | 0 | 0 | 운영 후보, 확인 필요 |
| 설기옥 | 미배정 | 미입력 | 5 | 0 | 상태 확인 필요 |
| 농가의식탁 | 박상일(경기) | 2026-07-06 | 0 | 0 | 운영 후보, 확인 필요 |
| 토종곱창 철산본점 | 박상일(경기) | 2026-06-15 | 0 | 1 | 운영 후보, 확인 필요 |
| 강릉장칼국수&보쌈 종무로 | 박규상 | 2026-06-29 | 0 | 0 | 운영 후보, 확인 필요 |
| 갑탄계 숯불치킨 불당점 | 박상일(경기) | 2026-06-22 | 0 | 0 | 운영 후보, 확인 필요 |

## Stage 1 반영 컬럼

- `environment`: `production | demo | training | test`
- `lifecycle_status`: `lead | onboarding | active | paused | archived`
- `data_owner_confirmed_at`
- `data_owner_confirmed_by`

기존 row는 migration 시 임의 기본값을 주지 않고 `unclassified` 상태로 backfill preview를 만든 뒤 대표 승인으로 확정한다.
