# Visual References

이 문서는 PRD를 구현할 때 참고해야 할 화면 이미지와 적용 위치를 정리한다. 개발 시 `prd.md`의 텍스트 요구사항만 보지 말고, 아래 이미지의 정보 밀도, 표 구조, 신호등 표현, 탭 흐름, 보고서 구성을 함께 기준으로 삼는다.

## 1. 키워드 입력 및 조합

- `references/images/keyword-input-sheet.png`
  - 지역/장소키워드, 수식어, 메뉴키워드, 특수키워드, 단독키워드 입력 구조의 원본 참고 이미지
  - 키워드 조합기 입력 그룹 설계 기준
- `references/images/keyword-combinator-ui.png`
  - 조합 규칙 체크박스 UI 참고
  - 2개/3개/4개 키워드 조합 선택 방식 참고
- `references/images/keyword-combinator-reference.png`
  - 매장별 유입/키워드 페이지 안에 들어갈 키워드 조합기 최신 참고
  - 5개 키워드 그룹 입력, 조합 선택, 50개 태그용/1000개 파워링크용 세트 분리 기준

## 2. 전체 매장 운영 대시보드

- `references/images/store-list-progress-dashboard.png`
  - 매장 목록, 담당자, 상태 점, 4주 관리 진행률 바, 필터/검색 구조 참고
  - 관리 시작일과 종료일, 현재 주차 진행률 표시 기준
- `references/images/dashboard-week-color-feedback.png`
  - 운영 대시보드 수정 기준
  - 1주차 초록, 2주차 흰색, 3주차 주황, 4주차 빨강 주차 배지 강조 참고
  - 업체명 이후 담당자, 비즈머니, 네이버 유입+4주 그래프, 매출, 업무현황, 바로가기 배치 참고
- `references/images/weekly-operations-table.png`
  - 최근 4주 W0/W1/W2/W3 지표를 한 줄에서 비교하는 표 구조 참고
  - 네이버 유입, 검색광고 클릭/CPC, 파워링크 노출, 매출, 신규/재방문 매출 표시 기준
- `references/images/integration-keyword-management-table.png`
  - 연동 상태, 정보안내문 수, 여신 연동, 검색광고 연동, 앱 가입, 대표 키워드 칩 형태 참고

## 3. 매장 상세 및 계정/링크 영역

- `references/images/store-daily-tasks-links.png`
  - 업체 보고서 링크, 사장님 페이지 링크, 설문조사 계정, 복사 버튼 UI 참고
  - 매장 상세 상단 정보 카드 구성 기준
- `references/images/store-info-feedback.png`
  - 매장 정보 화면 수정 기준
  - 네이버/검색광고/인스타그램/구글/카카오맵/여신금융 계정, 사장님 보고서 링크, 정보안내문 링크, 매장별 업무 리스트 구성 참고

## 4. 네이버 검색광고 대시보드

- `references/images/naver-searchad-dashboard.png`
  - API 연결 완료 상태, 비즈머니 잔액, 기간 조회, 계정 통계 카드, 캠페인 목록 UI 참고
  - 노출수, 클릭수, 광고비, CTR, CPC, 평균순위, 전환수, 캠페인 수 표시 기준

## 5. 플레이스 순위 추적

- `references/images/place-rank-history-cards.png`
  - 키워드별 날짜 카드, 순위/저장/블로그/영수증 지표 표시 방식 참고
  - 더보기 버튼과 스크롤 가능한 모달/패널 구조 참고

## 6. 일일업무관리

- `references/images/daily-work-management.png`
  - 날짜/담당자/업체명 필터, 업체별 업무 묶음, 업무 상태 변경 UI 참고
  - 완료 업무가 사장님 보고서에 반영되는 업무 흐름 기준

## 7. 사장님 보고서

- `references/images/owner-report-overview.png`
  - 성장지표, 목표 키워드 순위 추적, 1주차 업무 리스트가 함께 보이는 보고서 구조 참고
- `references/images/owner-report-weekly-tasks.png`
  - 1주차~4주차 업무 리스트, 완료 상태, 펼침 상세 영역 참고
- `references/images/owner-report-checklist-reference.png`
  - 사장님 보고서 하단에 실제 주간 업무 체크리스트가 이어지는 구조 참고
  - 내부 직원은 수정 가능, 사장님 공유 링크에서는 읽기 전용으로 보이는 기준
- `references/images/owner-goal-ad-report.png`
  - 광고 성과, 목표 매출/고객 계산, 기간 합계, 광고그룹 목록이 포함된 장기 보고서 참고
- `references/images/owner-information-questionnaire.png`
  - 사장님이 매장 기본정보, 계정, 메뉴, 사진, 마케팅 방향성을 작성하는 정보안내문 페이지 참고
  - 작성된 네이버 아이디/비밀번호와 매장 정보가 내부 매장 정보 화면에 동기화되는 흐름 참고

## 8. 여신금융 매출/고객 분석

- `references/images/card-sales-charts.png`
  - 날짜별 매출 막대 그래프와 고객수 선 그래프 조합 참고
  - 시간대별 매출, 요일별 매출, 기간별 통계, 객단가 통계 참고
- `references/images/sales-chart-reference-1.png`
  - 여신금융 화면 최신 수정 기준
  - 상단 기간 선택, 큰 날짜별 매출+결제수 그래프, 시간대/요일별 매출, 기간/객단가 통계 배치 참고
- `references/images/sales-goal-reference.png`
  - 목표매출, 목표개월, 객단가, 재방문률 기준 필요 신규/재방문 고객수 계획 참고
- `references/images/sales-new-repeat-dashboard.png`
  - 총매출, 신규 고객, 재방문율, 매출 추이, 신규 vs 재방문 도넛 차트 참고
  - 신규/재방문 매출과 객단가 요약 카드 구성 기준
- `references/images/sales-target-reference.png`
  - 목표매출, 목표 재방문률, 테이블 수, 객단가 기반 필요 신규/재방문 고객수 계산 화면 참고

## 9. 향후 리뷰/설문/CRM 연동

- `references/images/review-event-login-reference.png`
  - review-event-do.vercel.app 관리자 로그인 참고
- `references/images/review-event-survey-reference.png`
  - 설문 응답 통계, 방문 경로, 평가 항목 데이터 참고
- `references/images/review-event-crm-reference.png`
  - 고객 연락처, 방문/미방문 고객, CSV/TXT 다운로드, 고객 동의 데이터 참고
  - 향후 store UID 기반 CRM/설문/리뷰게임 참여수 연동에 사용

## 구현 원칙

- 내부 ERP는 표 중심, 고밀도 정보, 빠른 필터링, 신호등 상태 표시를 우선한다.
- 사장님 보고서는 내부 ERP보다 읽기 쉽게 구성하되, 실제 업무 진행과 성과 데이터가 바로 보이게 한다.
- 기존 이미지의 흐름을 해치지 말고, MVP 개발 시 먼저 표와 데이터 구조를 완성한 뒤 그래프와 고급 자동화 기능을 확장한다.
