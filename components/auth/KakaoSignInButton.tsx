"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function KakaoSignInButton({ callbackUrl }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("kakao", {
        redirect: false,
        redirectTo: callbackUrl || "/onboarding/role",
      });

      if (result?.url) {
        window.location.href = result.url;
        return;
      }

      throw new Error("카카오 로그인 페이지로 이동하지 못했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "카카오 로그인에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded bg-[#FEE500] px-3 text-[14px] font-semibold text-[#000000]/85 transition-colors hover:bg-[#f6dc00] focus:outline-none focus:ring-2 focus:ring-[#FEE500]/60 active:bg-[#e9cf00] disabled:cursor-wait disabled:opacity-70"
      >
        <span
          aria-hidden="true"
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#000000]/85 text-[11px] font-black leading-none text-[#FEE500]"
        >
          K
        </span>
        <span>{loading ? "이동 중..." : "카카오 로그인"}</span>
      </button>
      {error && (
        <p className="mt-2 text-center text-[12px] font-semibold text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
