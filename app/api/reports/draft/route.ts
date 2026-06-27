import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { TZ_CATALOG } from "@/lib/constants";
import {
  fmtTz,
  formatDow,
  formatMonthDay,
  primaryWallClockDateFromKstDate,
} from "@/lib/utils";

type ReportOptions = {
  summary?: boolean;
  understanding?: boolean;
  homework?: boolean;
  nextPlan?: boolean;
};

type ReportDraft = {
  summary: string;
  strengths: string;
  improvements: string;
  nextPlan: string;
};

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function normalizeSessionIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  const ids = value.filter(isPositiveInteger);
  return ids.length === value.length ? ids : null;
}

export function reportOffsetFromTimezone(timeZone: string | null | undefined) {
  return (
    TZ_CATALOG.find((timezone) => timezone.timeZone === timeZone)?.offset ?? 9
  );
}

async function getUserReportOffset(userId: string) {
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
    select: { primaryTimezone: true },
  });
  return reportOffsetFromTimezone(preference?.primaryTimezone);
}

function primaryDate(date: Date, primaryOffset: number) {
  return primaryWallClockDateFromKstDate(date, primaryOffset);
}

function formatPrimaryMonthDay(date: Date, primaryOffset: number) {
  return formatMonthDay(primaryDate(date, primaryOffset));
}

function formatPrimaryDow(date: Date, primaryOffset: number) {
  return formatDow(primaryDate(date, primaryOffset));
}

function sessionTitle(
  session: { start: Date; end: Date },
  primaryOffset: number,
) {
  return `${formatPrimaryMonthDay(session.start, primaryOffset)} ${fmtTz(
    session.start,
    primaryOffset,
  )}-${fmtTz(session.end, primaryOffset)}`;
}

function formatAmPmTime(date: Date, primaryOffset: number) {
  const [hourText, minuteText] = fmtTz(date, primaryOffset).split(":");
  const hour = Number(hourText);
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${String(displayHour).padStart(2, "0")}:${minuteText}`;
}

function summaryLine(
  session: { start: Date; end: Date; notes: string },
  primaryOffset: number,
) {
  const content = session.notes.trim() || "수업 내용 미기록";
  return `${formatPrimaryMonthDay(session.start, primaryOffset)} (${formatPrimaryDow(
    session.start,
    primaryOffset,
  )}) ${formatAmPmTime(session.start, primaryOffset)} ~ ${formatAmPmTime(
    session.end,
    primaryOffset,
  )}: ${content}`;
}

export function buildReportDraft({
  sessions,
  primaryOffset,
}: {
  sessions: {
    start: Date;
    end: Date;
    notes: string;
    understanding: string;
    focus: string;
    homework: { done: boolean }[];
  }[];
  primaryOffset: number;
}): ReportDraft {
  const goodCount = sessions.filter(
    (session) => session.understanding === "good",
  ).length;
  const hardCount = sessions.filter(
    (session) => session.understanding === "hard",
  ).length;
  const highFocusCount = sessions.filter(
    (session) => session.focus === "high",
  ).length;
  const pendingHomework = sessions.flatMap((session) =>
    session.homework.filter((homework) => !homework.done),
  );
  const summary =
    sessions.length > 0
      ? [...sessions]
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .map((session) => summaryLine(session, primaryOffset))
          .join("\n")
      : "선택한 수업이 없습니다.";

  return {
    summary,
    strengths:
      goodCount > 0 || highFocusCount > 0
        ? `선택한 수업 중 이해도가 좋은 수업 ${goodCount}개, 집중도가 높은 수업 ${highFocusCount}개가 확인됩니다. 안정적으로 따라온 단원과 태도를 중심으로 강점을 정리할 수 있습니다.`
        : "아직 뚜렷한 강점 기록이 부족합니다. 수업 중 잘 수행한 문제 유형이나 태도 변화를 보완해 주세요.",
    improvements:
      hardCount > 0 || pendingHomework.length > 0
        ? `어려움으로 기록된 수업 ${hardCount}개와 미완료 숙제 ${pendingHomework.length}개가 있습니다. 반복 복습이 필요한 단원과 과제 수행 흐름을 함께 점검하는 것이 좋습니다.`
        : "큰 보완 이슈는 두드러지지 않습니다. 다음 리포트에서는 오답 패턴과 풀이 속도를 더 구체적으로 관찰해 주세요.",
    nextPlan:
      sessions.length > 0
        ? `${sessionTitle(sessions[0], primaryOffset)} 수업 이후 흐름을 이어서, 다음 수업에서는 핵심 개념 복습과 대표 문제 재풀이를 진행하는 방향을 권장합니다.`
        : "선택한 수업이 없습니다. 리포트에 포함할 수업을 먼저 선택해 주세요.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const body = await request.json();
    const { studentId, sessionIds, options } = body as {
      studentId?: unknown;
      sessionIds?: unknown;
      options?: ReportOptions;
    };

    if (!isPositiveInteger(studentId)) {
      return NextResponse.json(
        { error: "studentId는 양의 정수여야 합니다." },
        { status: 400 },
      );
    }

    const ids = normalizeSessionIds(sessionIds);
    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "리포트에 포함할 sessionIds가 필요합니다." },
        { status: 400 },
      );
    }

    const offset = await getUserReportOffset(instructor.userId);

    const student = await prisma.student.findFirst({
      where: { id: studentId, instructorId: instructor.userId },
      select: { id: true, name: true },
    });
    if (!student) {
      return NextResponse.json(
        { error: "존재하지 않는 학생입니다." },
        { status: 404 },
      );
    }

    const sessions = await prisma.lessonSession.findMany({
      where: {
        id: { in: ids },
        studentId,
        student: { instructorId: instructor.userId },
      },
      include: {
        homework: {
          select: {
            done: true,
          },
        },
      },
      orderBy: { start: "desc" },
    });

    if (sessions.length !== ids.length) {
      return NextResponse.json(
        { error: "선택한 수업 중 찾을 수 없는 항목이 있습니다." },
        { status: 400 },
      );
    }

    const draft = buildReportDraft({
      sessions,
      primaryOffset: offset,
    });

    return NextResponse.json({
      draft,
      options: options ?? {},
      source: {
        studentId: student.id,
        sessionIds: ids,
      },
    });
  } catch (e) {
    console.error("[POST /api/reports/draft]", e);
    return NextResponse.json(
      { error: "리포트 초안 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
