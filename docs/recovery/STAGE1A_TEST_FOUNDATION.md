# Stage 1A 회귀검증 기반 결과

- 실행일: 2026-07-19
- 브랜치: `recovery/stage-1a-test-foundation`
- 부모 기준선: Stage 0 commit `319f37d`
- 범위: 테스트·lint·비밀값 검사와 fixture만
- DB migration, 원격 DB 변경, UI 기능 변경, 배포, 광고 쓰기: 없음

## 1. 추가한 검증 명령

| 명령 | 목적 | 결과 |
|---|---|---|
| `npm ci` | lockfile 재현 설치 | 성공 |
| `npm test` | parser·JSON contract 6개 테스트 | 6/6 성공 |
| `npm run test:parsers` | Place CSV·여신 parser만 실행 | 성공 |
| `npm run typecheck` | TypeScript 검사 | 성공 |
| `npm run lint` | Next.js·React·TypeScript lint | 0 errors, 23 warnings |
| `npm run check:secrets` | tracked/untracked text secret pattern 검사 | 성공 |
| `npm run build` | production build | 성공 |
| `npm run verify:samples -- <json> <xls>` | 로컬 실제 표본 대조 | 성공 |

Next.js 16에서 `next lint`가 제거되어 기존 lint 명령이 깨져 있었다. [Next.js 공식 ESLint CLI 방식](https://nextjs.org/docs/app/api-reference/config/eslint)으로 `eslint.config.mjs`와 ESLint CLI를 도입했다.

## 2. 회귀 fixture

### Place CSV

- 주간 기간: 2026-07-13 ~ 2026-07-19
- 요약·키워드·채널·시간·요일과 증감 section
- 쉼표가 포함된 quoted keyword
- `실제 0`과 `모듈 없음` 경고 분리
- 기간 누락 거부

### 여신금융 XLS

- 실제 파일 구조와 같은 10열 한국어 header
- 개인정보가 없는 메모리 생성 workbook
- 승인 2건, 취소 1건
- 취소 매칭, 순매출, 순결제건수, 건당결제액
- UID 결정성과 source row 구분

### Naver JSON 2.0

- schema `2.0.0`, collector `1.4.1`
- 월간 30일
- 7개 module key
- `smartCall=summary_only`, detail disabled
- blocked module 보존

원본 JSON/XLS 파일은 개인정보·매장 식별자 보호를 위해 저장소에 복사하지 않았다.

## 3. 실제 표본 대조

### Naver Place JSON

- schema version: `2.0.0`
- collector version: `1.4.1`
- period: 2026-06-01 ~ 2026-06-30, month, 30일
- SmartCall: `summary_only`

### 여신금융 XLS

- period: 2026-06-01 ~ 2026-06-30
- 원본 row: 1,457
- parser transaction: 1,457
- 순매출: 128,910,000원
- 순결제건수: 1,429
- 건당결제액: 90,210원
- parser warning: 0

## 4. 기존 기술부채

ESLint가 기존 코드에서 23개 warning을 확인했다.

- 미사용 import/변수 13개
- localStorage hydration 등 effect 내부 동기 setState 7개
- hook dependency 1개
- render 중 `Date.now()` 1개
- `<img>` 최적화 1개

effect·purity 항목은 기존 동작을 이번 단계에서 바꾸지 않기 위해 error를 warning으로 유지했다. 규칙을 끄지 않았으며 Stage 1B/업무 원장 이관 때 구조적으로 해결한다. 안전한 `let -> const` 1건만 수정했다.

## 5. 의존성 보안 감사

`npm audit --omit=dev` 결과:

- Next 내부 PostCSS moderate 2건: 제시된 강제 수정은 Next 9로의 breaking downgrade를 요구해 적용하지 않음
- `xlsx@0.18.5` high 1건: prototype pollution/ReDoS, npm registry에서 수정 버전 없음

`npm audit fix --force`는 실행하지 않았다. 현재 XLS 업로드는 Stage 1B 인증이 완료되기 전 외부 공개를 금지하고, 내부 직원·파일 크기 제한·실패 격리만 허용한다. Stage 3 Import Control Plane에서 `xlsx` 대체 또는 sandbox parser를 결정한다.

## 6. 변경 파일

- `package.json`, `package-lock.json`
- `eslint.config.mjs`
- `app/page.tsx`: lint가 확인한 `let -> const` 1건
- `tests/parsers/*`
- `tests/contracts/*`
- `tests/fixtures/*`
- `scripts/verify-samples.mjs`
- `scripts/check-secrets.mjs`

## 7. 다음 Gate

Stage 1B는 API 인증 경계만 구현한다.

- 로그인과 서버 session
- role·담당 store 확인
- 모든 service-role route의 401/403
- 다른 store ID 직접 요청 차단
- 원격 DB와 UI 대규모 변경 없음

대표 승인 전 Stage 1B로 넘어가지 않는다.

## 8. 주간 JSON 표본 추가 감사

2026-06-29~07-05와 2026-07-06~07-12 주간 JSON 2개를 추가 확인했다.

- schema `2.0.0`, collector `1.4.1` 일치
- 동일 매장 fingerprint
- SHA-256 완전 중복 0개
- 월요일~일요일 7일 기간 2개가 연속되어 주차 gap 0개
- SmartCall은 두 파일 모두 `summary_only`
- 첫 주간의 일별 매출은 월경계 때문에 6월 29~30일이 빠졌으나 주간 총액은 complete
- 월간 6월 일별 fact로 두 날짜를 보충하면 주간 총액 31,829,400원과 정확히 일치
- 월간 표본의 6월 3일·6일은 날짜 행이 있어도 금액이 null이고 `valueStatus=missing`이므로 실제 0과 구분해야 함

이를 고정하기 위해 `weekly-coverage.ts`, 누락·중복·비정상 주차·일별 상세 누락 테스트, `verify:place-periods` 명령을 추가했다. 상세 정책은 `docs/product/WEEKLY_DATA_INGESTION_POLICY.md`에 기록했다.
