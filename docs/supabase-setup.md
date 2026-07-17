# Supabase 연결 기준

## 현재 상태

- Supabase 프로젝트: `iutsvjtrklasrmjukkie` (서울 리전, 정상)
- 기존 파일/통화 처리 테이블은 유지한다.
- ERP 전용 테이블은 `erp_` 접두사를 사용한다.
- 주간 업로드는 매장과 `period_start`, `period_end`를 기준으로 누적한다.
- 업로드 원본과 분석 결과를 분리할 수 있도록 원본 파일 경로와 가공 JSON을 함께 저장한다.

## 생성된 핵심 테이블

- `erp_stores`: 매장 기본 정보와 MID
- `erp_place_csv_uploads`: 매장별 주간 플레이스 CSV 업로드 이력
- `erp_place_keyword_rows`: 주차별 유입 키워드
- `erp_place_channel_rows`: 주차별 유입 채널
- `erp_sales_uploads`: 여신금융 업로드 결과
- `erp_keyword_jobs`, `erp_keyword_results`: 꿀키워드 탐색 작업과 결과

## 앱 연결

서버 전용 환경변수에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 설정한다. 서비스 롤 키는 브라우저 코드나 GitHub에 넣지 않는다. 현재 API 경로는 `/api/erp/stores`, `/api/erp/place-uploads`이며, 기존 localStorage 화면을 단계적으로 이 API와 교체한다.

## 다음 연결 순서

1. 매장 목록 조회/등록을 `erp_stores`에 연결
2. 플레이스 CSV 파싱 결과를 `erp_place_*`에 저장
3. 유입/키워드 화면을 선택 매장 + 기간 기준 DB 조회로 변경
4. 여신금융 업로드 결과를 `erp_sales_uploads`에 저장
5. 꿀키워드 탐색 결과를 `erp_keyword_jobs/results`에 저장
