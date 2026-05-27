import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없음 | 쌤플래너",
};

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-[460px] rounded-[18px] border border-slate-200 bg-white p-6 text-center shadow-[0_18px_55px_rgba(15,23,42,.08)]">
        <img
          src="/images/logo/app_logo.jpg"
          alt="쌤플래너"
          className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-[0_12px_30px_rgba(16,67,109,.18)]"
        />
        <div className="mt-6 text-[12px] font-extrabold uppercase tracking-wide text-sky-600">
          404
        </div>
        <h1 className="mt-2 text-[26px] font-black tracking-tight text-slate-950">
          페이지를 찾을 수 없어요
        </h1>
        <p className="mt-3 text-[14px] font-medium leading-6 text-slate-500">
          주소가 변경되었거나 더 이상 사용할 수 없는 페이지입니다.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-500 px-4 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(16,67,109,.25)] transition-all hover:-translate-y-px hover:bg-sky-600 hover:shadow-[0_4px_14px_rgba(16,67,109,.34)]"
          >
            홈으로 이동
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            로그인 화면
          </Link>
        </div>
      </section>
    </main>
  );
}
