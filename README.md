# 맞춤장사 OS

음식점 마케팅 대행사의 매장 운영, 업무 표준화, 플레이스/광고/매출 분석, 사장님 보고를 하나로 연결하는 ERP 프로젝트입니다.

## 바로가기

- 배포 사이트: https://naver-place-marketing-erp.vercel.app
- GitHub: https://github.com/jangsamarketing-hub/Mkt.ERP
- 전체 인수인계: [HANDOFF.md](./HANDOFF.md)
- 통합 문서팩: [docs/handoff-2026-07-19/README.md](./docs/handoff-2026-07-19/README.md)
- 기존 상세 PRD: [prd.md](./prd.md)

## 현재 상태

이 저장소는 완성된 ERP가 아니라 다음 세 상태가 함께 존재하는 통합 MVP입니다.

1. **DB 연결됨**: 매장 목록 일부, 네이버 플레이스 주간 CSV, 여신금융 XLS 원본/정규화 데이터
2. **브라우저 임시 저장**: 일일업무, 통화 히스토리, 매장 세팅 체크, 일부 매장 정보와 키워드 결과
3. **화면 예시 중심**: 네이버 광고 종합 대시보드, 사장님 보고서 공유, 주간 통합 흐름 일부

다음 개발자는 화면을 새로 만들기보다 `store_id`를 공통키로 데이터 원장을 완성하고, 브라우저 임시 데이터를 Supabase로 이전해야 합니다.

## 실행

```bash
npm install
npm run dev
```

프로덕션 빌드 확인:

```bash
npm run build
```

환경변수 이름은 `.env.example`을 참고하며 실제 키는 문서나 Git에 기록하지 않습니다.

