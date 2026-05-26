import type { Metadata } from "next";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { KakaoSignInButton } from "@/components/auth/KakaoSignInButton";

export const metadata: Metadata = {
  title: "로그인 | 쌤플래너",
};

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <img
            src="/images/logo/app_logo.jpg"
            alt="쌤플래너"
            className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-[0_12px_30px_rgba(16,67,109,.18)]"
          />
          <h1 className="mt-4 text-[28px] font-black tracking-tight text-slate-950">
            쌤플래너
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-6 text-slate-500">
            수업 관리와 리포트를 이어서 사용하려면 로그인하세요.
          </p>
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.08)]">
          <div className="space-y-2">
            <GoogleSignInButton callbackUrl={searchParams?.callbackUrl} />
            <KakaoSignInButton callbackUrl={searchParams?.callbackUrl} />
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] font-medium leading-5 text-slate-400">
          초대 코드를 받은 학부모도 같은 계정으로 로그인한 뒤 학생 연결을 진행합니다.
        </p>

        <div className="mt-3 text-center">
          <a
            href="/privacy"
            className="text-[12px] font-semibold text-slate-400 underline-offset-4 transition-colors hover:text-slate-600 hover:underline"
          >
            개인정보처리방침
          </a>
        </div>
      </section>
    </main>
  );
}
