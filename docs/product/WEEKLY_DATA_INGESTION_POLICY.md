# 주간 데이터 적재·누락 관리 정책

## 결론

맞춤장사 OS의 운영 데이터는 **Place와 여신금융 모두 월요일~일요일 주간 파일을 기본**으로 쌓는다. 월간 파일은 최초 과거이력과 월간 보고서 대조용으로만 보관한다. 대시보드의 세부 디자인은 신뢰 가능한 read model이 완성된 뒤 붙이지만, 어떤 화면이 어떤 데이터와 상태를 읽을지는 지금 확정한다.

## 1. 이번 표본에서 확인한 것

| 표본 | 기간 | grain | schema | 판정 |
|---|---|---|---|---|
| 최초 월간 | 2026-06-01~06-30 | month, 30일 | 2.0.0 / collector 1.4.1 | bootstrap |
| 주간 1 | 2026-06-29~07-05 | week, 7일 | 2.0.0 / collector 1.4.1 | 운영 주차 1 |
| 주간 2 | 2026-07-06~07-12 | week, 7일 | 2.0.0 / collector 1.4.1 | 운영 주차 2 |

- 세 파일의 익명 store fingerprint가 같다.
- 세 파일의 SHA-256은 모두 달라 완전 중복 파일은 없다.
- 두 주간 파일은 월요일~일요일이며 서로 하루도 비지 않고 연결된다.
- file/module coverage는 report, place, sales, reservation, reviews, aiReview complete다.
- SmartCall은 두 주 모두 `summary_only`다. 상세 통화 데이터로 표시하면 안 된다.

## 2. 가장 중요한 품질 발견

첫 주간 파일은 주간 총매출 31,829,400원이 검증됐지만 `dailySales`에는 7월 1~5일만 있고 6월 29~30일이 없다. 파일의 quality score는 100이고 sales coverage도 complete이므로 파일 상태만 보면 이 누락을 놓친다.

월간 6월 파일의 6월 29일 3,736,000원과 6월 30일 3,091,000원을 보충하면 7일 합계가 정확히 31,829,400원이 된다. 따라서 다음처럼 서로 다른 완성도를 기록해야 한다.

| 데이터 단위 | 첫 주간 판정 |
|---|---|
| 주간 총매출 | complete |
| 일별 매출 상세 | partial → 월간 bootstrap으로 검증 보충 가능 |
| SmartCall 총 통화 | summary_only |
| SmartCall 상세 | unsupported |

이 구분이 없으면 일별 그래프는 2일을 0원으로 보여주고 주간 합계와 모순된다. 누락은 절대로 실제 0으로 바꾸지 않는다.

월간 6월 표본에서는 6월 3일과 6월 6일의 날짜 행이 존재하지만 `amount=null`, `valueStatus=missing`이다. 따라서 날짜 행의 존재만으로 일별 데이터가 있다고 판정하면 안 된다. 실제 `0원`은 숫자 0과 available 상태로 보존하고, 값이 비어 있는 날은 `missing`으로 유지해 그래프 단절 또는 미수집 표식을 보여준다. 월간·주간 공식 합계가 검증됐더라도 그 사실만으로 일별 상세까지 complete로 승격하지 않는다.

## 3. 저장 계층

```text
파일 업로드
  → Raw file: 원본·hash·schema·기간 보존
  → Snapshot: 파일 해석 결과와 revision 보존
  → Module coverage: 모듈·세부 grain별 완성도
  → Fact: 키워드·채널·시간·요일·일별 매출 등
  → Representative pointer: 같은 기간 수정본 중 승인본 선택
  → Read model: 화면이 사용할 중복 없는 주간/일별 데이터
```

### 중복 키

- 완전 동일 파일: `(store_id, source, content_sha256)` → duplicate
- 같은 기간 다른 내용: `(store_id, source, period_type, period_start, period_end, schema_version)`은 같고 hash가 다름 → revision 또는 conflict
- fact는 `(snapshot_id, metric grain key)`로 보존해 수정본이 과거 행을 덮어쓰지 않게 한다.
- 화면은 `representative_snapshot_pointers`가 가리키는 승인본만 읽는다.

월간과 주간은 기간이 겹쳐도 서로 다른 grain이므로 raw/snapshot 중복이 아니다. 다만 분석에서 두 값을 더하지 않는다.

## 4. 누락 주차 판정

매장마다 `weekly_collection_start_date`를 월요일로 정한다. 그 주부터 완료된 최근 일요일까지 매주 expected period를 생성한다.

상태:

- `complete`: 대표 주간 snapshot과 필수 모듈이 모두 있음
- `partial`: 주간 합계는 있지만 일별/모듈 일부가 빠짐
- `missing`: 종료된 주차인데 승인 snapshot 없음
- `duplicate`: 동일 파일이 재업로드됨
- `revision`: 같은 기간에 다른 내용의 새 파일이 들어옴
- `not_due`: 아직 끝나지 않은 주차
- `unsupported`: 원천에서 제공하지 않는 상세

누락 주차는 업로드 화면과 관리용 페이지에서 회색 `2026-07-13~07-19 미수집`처럼 표시한다. 직원이 파일을 추가 발행해 업로드하면 같은 expected period가 complete 또는 partial로 전환된다.

일별 상세 판정은 `날짜 행 부재`와 `행은 있으나 값이 missing/null`을 모두 검사한다. 휴일 문구가 들어간 원천 행도 임의로 0원 처리하지 않는다.

## 5. 월간 bootstrap 사용 규칙

1. 최초 계약 시 가능한 과거 월간 파일을 적재한다.
2. 월간 snapshot은 `period_type=month`로 그대로 보존한다.
3. 주간 운영 시작 후에는 주간 snapshot이 대표다.
4. 월경계 주간에서 일별 상세가 빠지면 월간의 동일 날짜 fact를 후보로 대조한다.
5. 금액이 주간 공식 총액과 맞을 때만 `backfilled_verified`로 선택한다.
6. 맞지 않으면 자동 결합하지 않고 needs_review로 보낸다.

## 6. 여신금융 적용

여신 파일도 주간 import를 기본으로 하되 transaction 원장은 날짜별 원본 행을 보존한다.

- 동일 원본 파일 hash 중복 차단
- `(import_id, source_row_number)` 원문 보존
- transaction UID와 취소 매칭 후보 검사
- 월간 최초 파일과 이후 주간 파일이 겹치면 transaction link로 중복 후보를 만들고 자동 합산하지 않음
- 주차별 순매출·순결제건수·건당결제액 snapshot 생성
- 마스킹 카드 반복은 고객이 아니라 결제 패턴으로만 사용

실제 주간 여신 표본을 받으면 취소·승인·월경계·중복 transaction 규칙을 한 번 더 고정한다.

## 7. 화면별 데이터 연결을 지금 정하는 이유

픽셀 디자인은 뒤에 해도 되지만 데이터 계약은 지금 정해야 한다. 그렇지 않으면 화면마다 같은 매출을 서로 다른 방식으로 계산하게 된다.

| 화면 | 읽을 데이터 | 표시할 품질 상태 |
|---|---|---|
| 관리용 페이지 | 최근 4개 대표 주간 snapshot, 업무 주차 | complete/partial/missing과 신호색 |
| 매장 상세 | 최신 주간 Place·여신·광고·업무 | 최신 기준일, 모듈별 상태 |
| 올인원 | 주간 fact + 검증된 일별 fact + 목표 시나리오 | backfill 여부와 기준 기간 |
| 사장님 보고서 | 승인된 report snapshot | 내부 경고를 정리한 공개 문구 |
| 주간 업로드 관제 | expected period와 import 상태 | 누락 주차, 중복, revision |
| 초기 제안서 | 월간 bootstrap + 상권 1회 snapshot | 출처·기간·가용 범위 |

화면은 Raw JSON이나 업로드 테이블을 직접 읽지 않고 read model/API DTO만 사용한다.

## 8. 구현 순서

1. Auth·store_id 경계
2. 공통 import와 expected weekly periods
3. Raw/Snapshot/Module coverage
4. Place JSON adapter와 fact
5. 여신 주간 transaction/fact
6. 대표 pointer와 중복·revision 승인
7. read model/API
8. 관리용 페이지와 업로드 누락 표시
9. 올인원·사장님 보고서의 상세 디자인

즉, 디자인을 무작정 마지막으로 미루는 것이 아니라 **데이터가 들어갈 자리와 빈 상태는 지금 설계하고, 실제 시각화 구현은 데이터 원장이 검증된 뒤 진행**한다.
