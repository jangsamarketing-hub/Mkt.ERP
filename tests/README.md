# Regression fixtures

이 폴더의 fixture는 실제 파일의 구조와 계산 규칙만 보존하고 매장명, MID, 승인번호, 카드번호 등 운영 식별자는 포함하지 않는다.

- `fixtures/place-weekly.csv`: 기존 Place 주간 CSV parser
- `fixtures/credit-finance-fixture.mjs`: 실행 중 생성되는 익명 XLS workbook
- `fixtures/naver-place-json-2.0.0.sanitized.json`: 신규 JSON 2.0 contract

실제 표본은 저장소 밖에서 다음처럼 읽기 전용 대조한다.

```powershell
npm.cmd run verify:samples -- "<naver-json-path>" "<credit-xls-path>"
```

실제 원본 파일이나 출력된 개인정보를 commit하지 않는다.
