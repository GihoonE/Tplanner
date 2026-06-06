import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import "./landing.css";

export const metadata: Metadata = {
  title: "Tplanner — 과외 선생님을 위한 올인원 관리 도구",
  description:
    "수업 일정, 학생, 숙제, 학부모 리포트까지. 흩어진 과외 관리를 한 곳에서. Tplanner.",
};

export default function RootPage() {
  return <LandingPage />;
}
