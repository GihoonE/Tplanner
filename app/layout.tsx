import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "쌤플래너",
  description: "개인 과외 선생님을 위한 학생 관리 · 수업 기록 · 리포트 플랫폼",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="h-screen overflow-hidden bg-[#f5f7fb]">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
