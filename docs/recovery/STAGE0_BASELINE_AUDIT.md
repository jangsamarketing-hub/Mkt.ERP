# Stage 0 기준선 감사

- 감사일: 2026-07-19
- 저장소: `jangsamarketing-hub/Mkt.ERP`
- 기준 커밋: `c1649f49bc5c1927d3ead459c9fef8187679b0e0`
- 프로덕션: `https://naver-place-marketing-erp.vercel.app`
- ERP Supabase: `iutsvjtrklasrmjukkie`
- 검색광고 개발 Supabase: `udaxbwmkohnfsyyjukoj`

## 1. 감사 결론

현재 앱은 폐기하거나 새로 만드는 대상이 아니다. 매장 6개, Place CSV 적재, 여신금융 상세승인 1,457건, 주요 운영 화면이 실제 Supabase 데이터에 연결되어 있어 이 기준선을 보존하고 작은 PR로 보강한다.

Stage 0에서는 제품 코드, 원격 DB, 프로덕션 배포를 변경하지 않았다. 원격 ERP 스키마를 읽기 전용으로 확인했고, 저장소 migration과의 차이, 보안 경계, 데이터 품질 위험을 기록했다.

## 2. Git 기준선과 복구 지점

| 항목 | 상태 |
|---|---|
| 기준 커밋 | `c1649f49bc5c1927d3ead459c9fef8187679b0e0` |
| 기준 보존 브랜치 | `backup/pre-recovery-20260719` |
| 기준 보존 태그 | `backup-pre-recovery-20260719` |
| 현재 작업 브랜치 | `recovery/stage-0-baseline` |
| 원격 push | 하지 않음 |
| 배포 | 하지 않음 |

롤백은 제품 변경 전까지 기준 태그 또는 보존 브랜치로 돌아가는 방식이다. 이후 migration은 `expand -> backfill -> dual-read -> canary -> pointer 전환` 순서와 별도 down/forward-fix 절차를 PR마다 명시한다.

## 3. 현재 저장소 실제 상태

### 실제 Supabase 연동

- `erp_stores`: 매장 원장 6개
- Place CSV 업로드 및 정규화 테이블: 업로드 5건, 키워드 1,800건, 채널 44건, 시간대 92건, 요일 28건
- 여신금융 상세승인: import 1건, 거래 1,457건, 일별·시간대별 요약 view
- Drive/통화/처리 작업 테이블: 실제 row 존재
- API route는 서버용 Supabase 관리자 클라이언트를 사용한다.

### localStorage

- 일일/주간 업무와 일부 화면 상태는 브라우저 저장소 중심 구현이 남아 있다.
- 다른 브라우저·다른 직원 간 동일 상태를 보장하지 못하므로 Stage 9 이전에는 실제 운영 원장으로 간주하지 않는다.
- 이관 시 기존 데이터를 즉시 삭제하지 않고 `백업 -> import preview -> 매장 매핑 -> 승인 -> DB 저장 -> 대조 -> 브라우저 데이터 보관/폐기` 절차를 적용한다.

### 하드코딩·예시

- 비즈머니, 네이버 유입, 매출, 업무 진행률 중 일부는 화면별로 실제 DB, 빈 상태, 예시 상태가 섞여 보일 수 있다.
- `데이터 없음`, `미수집`, `미지원`, `부분수집`, `실제 0`을 이후 공통 상태 코드로 분리한다.
- 광고 자동화 UI는 완전 실행 기능으로 간주하지 않으며, 승인형 실행 전까지 draft 또는 placeholder로 표시한다.

### 깨졌거나 불확실한 기능

- 검색광고 개발 Supabase는 권한 거부로 실스키마를 확인하지 못했다.
- 공개 schema의 RLS는 켜져 있지만 정책이 없고, 서버 API는 service-role 기반이라 API 자체 권한 검사가 없으면 RLS를 우회한다.
- 일별·시간대별 카드 요약 view가 security-definer로 검사되어 접근 경계 검토가 필요하다.
- Storage MIME 허용 목록에 JSON과 XLSX가 없어 신규 업로드 요구와 불일치한다.
- 자동화된 테스트 명령과 회귀 fixture가 아직 없다.

## 4. 데이터 표본 확인

### 신규 Naver Place JSON

- schema version: `2.0.0`
- collector version: `1.4.1`
- 기간: 2026-06-01 ~ 2026-06-30 월간
- 수집 상태: `smartCall`은 `summary_only`; 모듈별 지원·부분지원·미지원 상태를 원문 그대로 보존해야 한다.
- 기존 CSV와 같은 fact를 공유할 수는 있지만 JSON 원문을 기존 CSV row 테이블에 직접 밀어 넣지 않는다.
- 적재 기준: `Raw -> Snapshot -> Fact -> Analytics`
- 중복·대표본 판정: store, module, grain, period, source version을 함께 사용한다.

### 여신금융 XLS

- 상세승인 1,457행, 10열
- 화면 표시 합계: 128,910,000원
- 마스킹 카드번호 앞 4+2 또는 앞 6자리의 반복은 실제 사람 식별자가 아니다.
- 외부 공개 용어는 `첫 관측 결제 패턴`, `반복 관측 결제 패턴`을 사용하고 고객 수로 단정하지 않는다.

## 5. 매장·store_id 무결성

- 확인한 10개 ERP 업무/업로드 테이블의 고아 `store_id`는 모두 0건이다.
- 현재 `erp_stores`를 canonical store registry의 보존 기준으로 삼는다.
- 테스트/샘플 여부를 나타내는 명시 컬럼이 없으므로 6개 매장을 임의 분류하지 않았다.
- 상세 분류는 `STORE_CLASSIFICATION.md`의 대표 확인 항목으로 남겼다.

## 6. 빌드·프로덕션 검증

### 로컬

- `npm ci`: 성공, lockfile 기준 108 packages 설치
- `npm run build`: 성공
- Next.js `16.2.10`, TypeScript 검사 성공, 정적 페이지 9개 생성

### 프로덕션 읽기 전용 smoke test

다음 화면은 2026-07-19에 신규 브라우저 탭에서 저장·업로드·완료처리 없이 정상 진입했다.

- 운영 대시보드
- 네이버 광고
- 유입/키워드
- 여신금융 매출
- 관리자 일일업무
- 일일 업무
- 주간 업무
- 사장님 보고서
- 매장 정보
- 정보안내문
- 매장 주간 데이터 흐름

이 검증은 화면 진입 smoke test이며 데이터 계산의 정확성이나 쓰기 동작을 승인한 것은 아니다.

## 7. 즉시 해결할 위험

1. service-role API에 세션·역할·store 범위 검사가 부족할 수 있다.
2. security-definer 카드 요약 view가 공개 API 경계를 우회할 수 있다.
3. 원격 최초 core migration이 저장소에 없고 version 번호도 일치하지 않는다.
4. 검색광고 개발 프로젝트가 감사되지 않아 통합 판단의 일부가 미확인이다.
5. 샘플 매장 flag, data source 표시, import 대표본 규칙이 없다.

## 8. Stage 1 전 Gate

- 대표가 실제 매장/테스트 매장 분류표를 승인한다.
- ERP 프로젝트를 canonical DB로 유지하는 결정을 승인한다.
- API Auth boundary를 매장 CRUD보다 먼저 구현하는 순서를 승인한다.
- 누락된 core migration을 원격 dump에서 재구성하되 원격 적용 없이 검토한다.
- 검색광고 개발 프로젝트 read 권한을 확보해 별도 감사를 완료한다.

## 9. 의도적으로 하지 않은 것

- 원격 DB migration 적용
- 원격 schema/row 수정
- 제품 코드·UI 변경
- Vercel 배포
- 광고 API 쓰기
- baseline migration 생성: `erp_stores`와 원격 core schema 승인 전에는 안전하지 않아 보류

