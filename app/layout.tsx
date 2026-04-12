import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TutorDesk",
  description: "개인 과외 선생님을 위한 학생 관리 · 수업 기록 · 리포트 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="h-screen overflow-hidden bg-[#f0f6fc]">{children}</body>
    </html>
  );
}
