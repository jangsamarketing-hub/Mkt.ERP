import * as XLSX from "xlsx";

export function buildCreditFinanceFixture() {
  const rows = [
    ["기간별승인내역 세부내역 - 익명 회귀 fixture"],
    ["건수", "3", "합계", "100,000"],
    ["No.", "구분", "거래일자", "거래시간", "카드사", "제휴카드사", "카드번호", "승인번호", "승인금액", "할부기간"],
    [1, "승인", "2026-07-01", "12:10:00", "테스트카드", "", "1111-22**-****-3333", "TEST-A001", "100,000", "일시불"],
    [2, "승인", "2026-07-01", "18:20:00", "테스트카드", "", "4444-55**-****-6666", "TEST-A002", "50,000", "일시불"],
    [3, "취소", "2026-07-01", "18:30:00", "테스트카드", "", "4444-55**-****-6666", "TEST-A002", "50,000", "일시불"]
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "기간별승인내역_세부내역");
  return XLSX.write(workbook, { bookType: "xls", type: "buffer" });
}
