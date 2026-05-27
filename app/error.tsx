"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-[460px] rounded-[18px] border border-slate-200 bg-white p-6 text-center shadow-[0_18px_55px_rgba(15,23,42,.08)]">
        <img
          src="/images/logo/app_logo.jpg"
          alt="쌤플래너"
          className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-[0_12px_30px_rgba(16,67,109,.18)]"
        />
        <div className="mt-6 text-[12px] font-extrabold uppercase tracking-wide text-sky-600">
          Something went wrong
        </div>
        <h1 className="mt-2 text-[26px] font-black tracking-tight text-slate-950">
          잠시 문제가 생겼어요
        </h1>
        <p className="mt-3 text-[14px] font-medium leading-6 text-slate-500">
          요청을 처리하는 중 오류가 발생했습니다. 다시 시도해도 반복되면
          잠시 후 접속해주세요.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-500 px-4 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(16,67,109,.25)] transition-all hover:-translate-y-px hover:bg-sky-600 hover:shadow-[0_4px_14px_rgba(16,67,109,.34)]"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            홈으로 이동
          </a>
        </div>

        {error.digest && (
          <p className="mt-5 text-[11px] font-semibold text-slate-400">
            오류 코드 {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
