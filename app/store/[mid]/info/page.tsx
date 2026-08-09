import { notFound } from "next/navigation";
import { PublicStoreInformationForm } from "@/components/public-store-information-form";
import { getPublicStore } from "@/lib/public-store";

type PageProps = { params: Promise<{ mid: string }> };

export default async function PublicInformationPage({ params }: PageProps) {
  const { mid } = await params;
  const store = await getPublicStore(mid);
  if (!store) notFound();
  return (
    <main className="public-store-shell public-info-shell">
      <header className="public-store-header"><span>장사ERP</span><strong>정보안내문</strong></header>
      <img alt="핑크 펭귄 장사 ERP 마스코트" className="public-hero-mascot" src="/brand/pink-penguin-portrait.png" />
      <section className="public-store-hero">
        <p>마케팅 시작 전 사전 정보 수집</p>
        <h1>{store.name}</h1>
        <span>작성해주신 정보는 담당 매니저가 확인합니다.</span>
      </section>
      <PublicStoreInformationForm mid={mid} storeName={store.name} />
      <footer className="public-store-footer">외부 서비스의 비밀번호, 인증번호, 카드번호는 입력하지 마세요.</footer>
    </main>
  );
}
