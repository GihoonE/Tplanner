import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 쌤플래너",
};

export default function PrivacyPage() {
  return (
    <main className="flex h-screen flex-col bg-[#f5f7fb]">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/images/logo/app_logo.jpg"
            alt="쌤플래너"
            className="h-9 w-9 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold text-slate-950">
              개인정보처리방침
            </h1>
            <p className="text-[12px] font-medium text-slate-500">
              쌤플래너
            </p>
          </div>
        </div>
        <a
          href="/docs/privacy-policy.pdf"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          PDF 열기
        </a>
      </header>

      <section className="min-h-0 flex-1 p-3 sm:p-5">
        <iframe
          title="쌤플래너 개인정보처리방침 PDF"
          src="/docs/privacy-policy.pdf"
          className="h-full w-full rounded-xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.08)]"
        />
      </section>
    </main>
  );
}
