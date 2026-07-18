# 맞춤장사 OS 통합 인수인계 문서팩

작성 기준일: 2026-07-19  
목적: 현재까지의 기획, 화면, 코드, 데이터베이스, 배포 상태를 다른 개발 환경에서도 그대로 이어갈 수 있게 전달한다.

## 서비스 한 문장

맞춤장사 OS는 음식점 마케팅 대행사가 매장별 진단, 90일 세팅, 업무 이행, 플레이스/광고/매출 데이터, 사장님 보고를 하나의 운영 흐름으로 관리하는 웹 ERP다.

## 현재 링크

- Vercel: https://naver-place-marketing-erp.vercel.app
- GitHub: https://github.com/jangsamarketing-hub/Mkt.ERP
- Vercel 프로젝트명: `naver-place-marketing-erp`
- Supabase 프로젝트 참조값: `iutsvjtrklasrmjukkie`

> 저장소 공개/비공개 상태와 Vercel-GitHub 작성자 연결은 서비스 설정에서 다시 확인해야 한다. 비밀키와 계정 비밀번호는 이 문서팩에 포함하지 않는다.

## 문서 구성

| 파일 | 내용 |
|---|---|
| `01_PRD_맞춤장사OS.md` | 최종 제품 요구사항 8개 항목 |
| `02_DATABASE_SPEC.md` | 현재 DB와 목표 DB 규격 |
| `03_PAGE_LOGIC_SPEC.md` | 11개 화면별 입력, 처리, 저장, 출력 로직 |
| `04_ANALYTICS_FORMULAS.md` | 신호등, 매출, 고객 필요수, 광고비 계산 공식 |
| `05_IMPLEMENTATION_STATUS.md` | 실제 구현/부분 구현/예시 화면 구분 |
| `06_ROADMAP_AND_ACCEPTANCE.md` | 병목 없는 개발 순서와 완료 기준 |
| `07_DEPLOYMENT_OPERATIONS.md` | GitHub, Vercel, Supabase 운영 기준 |
| `08_VISUAL_REFERENCE_INDEX.md` | 현재 화면 및 목표 참고 이미지 목록 |
| `09_SOURCE_MAP.md` | 코드 파일별 역할 |
| `10_ATTACHMENTS_MANIFEST.md` | 다음 대화에 첨부할 파일 목록 |
| `11_CURRENT_STATE_AND_NEXT.md` | 현재 완료·미완료 범위와 정확한 재개 순서 |
| `screenshots/` | 현재 배포된 11개 화면 캡처 |

## 현재 제품 상태를 읽는 법

- **실제 저장**: Supabase에 원본과 정규화 결과가 저장된다.
- **임시 저장**: 같은 브라우저의 `localStorage`에만 남는다. 다른 PC/직원과 공유되지 않는다.
- **화면 예시**: UI와 상호작용 일부만 있으며 실제 API/DB 값이 아니다.
- **목표 설계**: 아직 구현되지 않았지만 최종 제품에서 필요한 동작이다.

현재 화면은 위 네 상태가 섞여 있으므로, 페이지가 보인다는 이유만으로 기능이 완료됐다고 판단하면 안 된다.

## 인수인계 핵심

1. 기존 화면 구조와 사용자 흐름을 유지한다.
2. 모든 테이블과 업무는 `store_id`로 묶는다.
3. `localStorage` 데이터를 먼저 Supabase로 이전한다.
4. 업로드 원본, 파싱 결과, 분석 결과, 보고서 스냅샷을 분리한다.
5. 외부 광고 변경은 반드시 미리보기와 승인 단계를 거친다.
6. 데이터가 없으면 `데이터 없음`으로 표시한다.
7. 마스킹 카드번호를 실제 고객 식별자로 단정하지 않는다.
