import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "매장 마케팅 ERP",
  description: "네이버 플레이스와 검색광고 기반 매장 운영 관리 ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
