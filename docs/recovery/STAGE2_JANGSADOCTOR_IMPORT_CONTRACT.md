# Stage 2 장사 ERP 이관 Control Plane

작성일: 2026-07-19  
참조 패키지: 기존 ERP 전달 패키지 / schema `1.0.0`

## 결정

기존 장사 ERP 수집기는 **읽기 전용 JSON 생성기**다. 맞춤장사 OS 운영 DB에 직접 쓰지 않으며, 항상 다음 순서를 지킨다.

```text
수집 JSON → 형식·보안 검증 → preview(변경 없음) → 관리자 매장 연결 승인 → commit → 감사 로그
```

## 기존 원장과의 매핑

| 장사 ERP 데이터 | 맞춤장사 OS 저장 위치 | 원칙 |
|---|---|---|
| `source_company_id` | 새 `store_external_links` | `(jangsadoctor_erp, source_company_id)` 유일. 이름만으로 자동 병합 금지 |
| 매장명·관리시작일·담당자 | 기존 `erp_stores`와 서비스 이력 | 기존 `store_id` 보존 |
| 일별 총매출·건수 | 새 장사 ERP 일별 매출 원장 | 기존 여신금융 상세 승인 원장과 섞지 않음 |
| 정보안내문·제안서 | 원본 스냅샷 및 후속 전용 테이블 | 개인정보·원문 보존 정책 확정 뒤 commit |
| 플랫폼 계정 | 계정 ID/등록여부만 | 비밀번호 원문은 거부하며 저장하지 않음 |

## Stage 2A 범위

- schema `1.0.0` JSON 검증기
- `password_value` 값이 있으면 전체 거부
- 일별 매출의 날짜 순서·중복·합계 검증
- 매출 0원과 누락 날짜를 서로 다르게 기록
- snapshot hash와 `source_company_id` 기반 중복 방지 기준
- 실제 DB 변경 없는 preview 결과

## 원격 DB 적용 결과

적용 일시: 2026-07-19 11:35 KST  
원격 migration: `20260719113559_jangsadoctor_import_control_plane`

- 제어 테이블 7개를 추가했다.
- 기존 `erp_stores`, 네이버 Place, 여신 상세승인 데이터는 수정하지 않았다.
- 새 테이블 행 수는 모두 0건이다.
- 새 테이블 전체에 RLS를 적용했고 `anon`, `authenticated` 직접 조회 권한은 없다.
- RLS policy 미설정 안내는 서버 service role API만 사용하는 현재 단계의 의도된 상태다. 직원·사장님 계정 도입 시 역할별 policy를 추가한다.

## 이후 commit 범위

1. `store_external_links`, import run, snapshot, 장사 ERP 일별 매출 테이블 migration
2. 관리자 매장 후보 선택 및 단발 commit token
3. 원본 파일 Storage 보관과 감사 로그
4. 개인정보 포함 정보안내문·제안서의 암호화/보유기간 정책

## 명시적 제외

- 기존 장사 ERP 로그인 자동화, 쿠키·세션·CSRF 수집
- 광고·여신금융 비밀번호 원문 수집 또는 저장
- 매장명·주소만으로 한 자동 병합
- preview 중 운영 데이터 변경
- 장사 ERP 일별 매출을 신규·재방문 고객 수로 단정

## 실제 매장 반영 절차

실제 업체명·관리 시작일·매출 데이터가 준비되면, 예시 매장은 `sample`로 남기고 실제 매장 JSON을 먼저 preview 한다. 대표가 신규 생성 또는 기존 연결을 확인한 뒤에만 commit 하며, 누락 기간과 불일치 합계는 격리 목록으로 남긴다.
