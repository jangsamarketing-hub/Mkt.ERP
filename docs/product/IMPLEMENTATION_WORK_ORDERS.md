# 맞춤장사 OS 단계별 작업지시서

기준 문서:

- `docs/product/prd.md`
- workspace `../plans/맞춤장사OS_MASTER_BLUEPRINT_2026-07-19.md`
- `docs/recovery/STAGE0_BASELINE_AUDIT.md`

## 공통 실행 규칙

각 작업은 한 브랜치·한 목적·작은 PR로 수행한다. 모든 PR에는 `범위/제외/DB 변경/화면 변경/테스트/롤백/대표 승인 Gate`를 적는다. 원격 DB, Vercel, 광고 API 쓰기는 해당 PR의 별도 승인이 없으면 실행하지 않는다.

API 권한, 데이터 원장, import가 화면보다 먼저다. 광고는 `조회 -> snapshot 저장 -> 추천 -> 관리자 승인 -> dry-run -> 제한 실행 -> 재조회 검증 -> 원복` 순서를 바꾸지 않는다.

이 문서의 Stage는 대표 승인 단위이고 blueprint의 PR 번호는 기술 작업 묶음이다. 대응은 `Stage 0=PR 0`, `Stage 1A=PR 1`, `Stage 1B~1C=PR 2A~2C`, 이후 `Stage 2~14=PR 3~16`이다. PR 2A schema는 Stage 1C에 포함하지만, 실제 매장 CRUD 공개 전에 Stage 1B 권한 경계를 먼저 통과시킨다.

## Stage 0 — 기준선 복구

### 완료 산출물

- 기준 commit 보존 브랜치와 태그
- 원격 ERP schema 실측과 migration gap
- 환경변수 지도
- 매장 분류 확인표
- 두 Supabase 통합 결정
- PRD, master blueprint, 작업지시서
- build와 프로덕션 읽기 전용 smoke test

### 완료 조건

- 제품 코드·원격 DB·배포 변경 없음
- 대표 승인 전 Stage 1 미진입

## Stage 1A — 회귀검증 기반

- 브랜치: `recovery/stage-1a-test-foundation`
- 목표: 현재 동작을 보존하는 fixture·parser·API·주요 화면 테스트 기반
- 포함: Naver CSV/XLS fixture 익명화, 계산 회귀검증, CI build/test, secret scan
- 제외: schema 및 UI 기능 변경
- 롤백: 테스트 파일과 설정만 revert
- Gate: 현재 Place/여신 계산 결과가 fixture와 일치

## Stage 1B — API 인증 경계

- 브랜치: `recovery/stage-1b-auth-boundary`
- 목표: service-role API 앞에 로그인·역할·담당 매장 검사를 둔다.
- 포함: Supabase Auth, session helper, `requireStoreRole`, 401/403/IDOR 테스트, audit event
- 제외: 매장 CRUD 대규모 변경
- 롤백: 기존 API를 즉시 복구하지 않고 feature flag로 구경로 제한; 인증 실패 원인부터 수정
- Gate: 다른 매장 ID 직접 요청이 차단됨

## Stage 1C — Canonical Store Registry

- 브랜치: `recovery/stage-1c-store-registry`
- 목표: 모든 데이터와 화면이 보존된 `erp_stores.id` 하나를 사용
- 포함: organization/profile/store_members, lifecycle/environment, 외부 ID 매핑, 생성·수정·보관, Store Context
- 제외: 신규 JSON 적재, 광고 쓰기, localStorage 전체 이관
- 롤백: expand schema와 dual-read pointer 복귀
- Gate: 새 매장이 모든 선택기에 나타나고 고아 store_id 0건

## Stage 2 — 계약·전자서명 원장

- 목표: 계약서 버전·전자서명·외부 결제 확인·재계약 원장
- 순서: 2A 내부 계약 원장, 2B 목적 제한 공개 서명 링크
- 제외: TossPayments, 서명 즉시 자동 관리 시작
- Gate: 서명 문서 hash와 signer context가 불변으로 보존됨

## Stage 3 — 공통 Import Control Plane

- 목표: 모든 업로드가 같은 import job, raw file, 검증, 중복, quarantine, 승인 흐름 사용
- 포함: Storage MIME JSON/XLSX 보강, checksum, preview, reject reason, import audit, 월~일 expected period와 누락 주차 ledger
- 제외: 각 도메인의 신규 분석 UI
- Gate: 동일 파일 재업로드가 중복 처리되고 실패 row가 분리되며 누락 주차가 실제 0과 구분됨

## Stage 4 — Naver Place JSON 2.0

- 순서: 4A validator/adapter, 4B snapshot/fact, 4C CSV+JSON read model
- 핵심: `Raw -> Snapshot -> Fact -> Analytics`
- 포함: 주간 운영 기본값, 월간 bootstrap, schema version, 주/월 grain, module·세부 grain coverage, 대표 snapshot, overlap quarantine, 월간 일별 backfill 대조
- 제외: 순위 자동수집, 알림톡
- Gate: 기존 CSV 결과를 깨지 않고 JSON 2.0 월간/주간 fixture를 적재하며 주간 2개 사이 gap 0, 중복 0을 판정

## Stage 5 — 여신금융 일·주·월 원장

- 순서: 5A source row 보존, 5B canonical transaction link, 5C 집계·패턴 분석
- 핵심: 실제 고객이 아닌 `첫 관측/반복 관측 결제 패턴`
- 포함: 매출·결제건수·건당결제액·요일·시간대·기간 비교
- 제외: 카드 마스킹 값을 개인 ID로 확정
- Gate: 원본 합계·row 수·중복·취소/승인 규칙 대조

## Stage 6 — 관리용 신호등

- 목표: 전체 매장의 4주 Place·광고·매출·결제패턴·업무 흐름 관제
- 규칙: 개선/유지 파랑, 전주만 하락 주황, 전주와 최근 3주 기준선 모두 하락 빨강, 미수집 회색
- 포함: tolerance, 최소 표본, 0 나눗셈, data source badge
- Gate: W1~W3가 없으면 빨강이 되지 않음

## Stage 7 — 올인원 분석

- 목표: 실제 매장 상태와 목표 매출 경로를 한 화면에서 설명
- 포함: 매출·결제패턴·건당결제액, 시간/요일, 테이블 회전 입력, 목표 개월/매출/재방문률/객단가, 월별 선형 목표, CAC 계획
- 문구: 공개 화면에서 `추정` 단어를 사용하지 않고 산식·가정·데이터 기준일을 표시
- Gate: 입력값과 산식의 단위·반올림·결측 테스트

## Stage 8 — 업무·특이사항 원장

- 순서: 8A task ledger, 8B 전 매장 일일 관제, 8C 계약 관리 시작 atomic transaction
- 포함: 담당자, due date, 증빙, 댓글, 완료 event, 주차별 28일 template, 수동 업무 추가, 계약연장
- localStorage: preview와 대조 후 승인 이관
- Gate: 새 브라우저에서도 동일한 업무 상태

## Stage 9 — 매장 상세·사장님 보고서

- 순서: 정보안내문, 매장 작업실, owner live report, 2시간 영업용 snapshot
- 포함: 보고 링크, 정보안내문 progress, 항상 열린 특이사항, Place/여신/광고 read panel, 업무 이력
- 공유 링크: 목적·store·scope·만료가 제한된 hash token과 server DTO
- 제외: 원본 credential, 내부 메모, service key
- Gate: 링크 종류 간 데이터 범위가 섞이지 않음

## Stage 10 — 순위 추적·리뷰 분석·직원 도구

- 포함: 등록 매장 키워드 날짜별 순위, 성별/연령, 일회성 검색량 조회, 리뷰 100개 장단점 분석, 키워드 조합기 A~F
- placeholder: 광고계정 접속, 상세설명/오시는길/메뉴/쿠폰/새소식 GPTS 바로가기
- 제외: 경쟁업체 추적, 카카오 알림
- Gate: 자연순위와 유료순위를 분리하고 출처/측정시각 표시

## Stage 11 — 상권·고객유형 초기 진단

- 순서: 허용 자료 수동 snapshot -> 허용 API connector -> 월간 audience fit
- 포함: 소상공인365 상권분석 구간, 허용되는 지오비전/나이스 자료, 구주소 근사 위치, 낚시터-물고기-전략 narrative
- 제외: 약관을 확인하지 않은 JSON 무단 수집
- Gate: 출처·기준시점·지역 범위를 보고서에 표시

## Stage 12 — 검색광고 Read-only

- 목표: ERP DB로 통합된 계정·캠페인·그룹·성과·예산 snapshot
- 포함: 1계정·1캠페인·1그룹 파일럿, 잔액/노출/클릭/비용/CTR/CPC/평균순위
- 제외: 입찰 변경
- Gate: Naver 원본 합계와 snapshot 합계 일치

## Stage 13 — 검색광고 기본 세팅

- 포함: 예산·기간·성별·연령·소재·시간대 입력, campaign draft, 10만 키워드 1,000개 chunk, 태그 50개 chunk
- 실행: preview와 관리자 승인 후 dry-run까지만 기본 완료
- Gate: idempotency와 API 한도 검증

## Stage 14 — 승인형 광고 실행

- 순서: 14A 제한 실행, 14B 30분 shadow monitor, 14C 프리미엄 CPC 자동조정
- 제한: 2~9위 목표, bid/budget cap, 허용 시간대, kill switch, compare-and-swap 원복
- Gate: 대표가 지정한 테스트 계정 외 실행 불가

## Stage 15 — QR/CRM과 일마감

- 포함: 고객 동의 원장, 방문감사 이벤트, 자발적 리뷰 안내, 고객 DB, 사장님 미션, 수동 일마감
- 제외: 리뷰 보상 강제, OCR 완전자동
- Gate: 동의 철회·매장별 데이터 격리·정책 문구 검토

## Stage 16 — 알림과 EXIT

- 포함: 순위/위험 신호 이메일·Slack 우선, 필요 시 Kakao 알림톡, 제한된 유지관리, EXIT 기초 리포트
- 제외: 권리금 보장 표현
- Gate: 비용·빈도·수신 동의·해지 흐름 승인

## 다음 실행 명령

Stage 0 승인 후에도 한 번에 하나만 실행한다. 첫 대상은 **Stage 1A 회귀검증 기반**이며, Stage 1B 또는 DB migration으로 건너뛰지 않는다.
