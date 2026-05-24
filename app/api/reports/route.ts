import { NextRequest, NextResponse } from "next/server";
import {
  requireInstructor,
  requireViewer,
  studentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

const reportInclude = {
  student: {
    select: {
      id: true,
      name: true,
      subject: true,
      grade: true,
      color: true,
      avatarChar: true,
    },
  },
  sessions: {
    include: {
      session: {
        select: {
          id: true,
          start: true,
          end: true,
          notes: true,
          place: true,
          understanding: true,
          focus: true,
        },
      },
    },
    orderBy: {
      session: {
        start: "asc",
      },
    },
  },
} as const;

type ReportWithRelations = {
  id: number;
  studentId: number;
  title: string;
  status: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  summary: string;
  strengths: string;
  improvements: string;
  nextPlan: string;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: number;
    name: string;
    subject: string;
    grade: string;
    color: string;
    avatarChar: string;
  };
  sessions: {
    sessionId: number;
    session: {
      id: number;
      start: Date;
      end: Date;
      notes: string;
      place: string;
      understanding: string;
      focus: string;
    };
  }[];
};

function parsePositiveInt(value: string | null, field: string) {
  if (value == null || value === "") return null;
  if (!/^\d+$/.test(value)) {
    return { error: `${field}는 양의 정수여야 합니다.` };
  }
  const num = Number(value);
  if (!Number.isSafeInteger(num) || num < 1) {
    return { error: `${field}는 양의 정수여야 합니다.` };
  }
  return { value: num };
}

function normalizeSessionIds(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const ids = value.filter(
    (id): id is number => Number.isInteger(id) && Number(id) > 0,
  );
  return ids.length === value.length ? Array.from(new Set(ids)) : null;
}

function parseDate(value: unknown, field: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    return { error: `${field}는 ISO 날짜 문자열이어야 합니다.` };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `${field}는 유효한 날짜여야 합니다.` };
  }
  return { value: date };
}

function normalizeStatus(value: unknown) {
  if (value == null || value === "") return "draft";
  return value === "draft" || value === "sent" ? value : null;
}

function serializeReport(report: ReportWithRelations) {
  return {
    id: report.id,
    studentId: report.studentId,
    title: report.title,
    status: report.status,
    periodStart: report.periodStart?.toISOString() ?? null,
    periodEnd: report.periodEnd?.toISOString() ?? null,
    summary: report.summary,
    strengths: report.strengths,
    improvements: report.improvements,
    nextPlan: report.nextPlan,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    student: report.student,
    sessionIds: report.sessions.map((item) => item.sessionId),
    sessions: report.sessions.map((item) => ({
      id: item.session.id,
      start: item.session.start.toISOString(),
      end: item.session.end.toISOString(),
      notes: item.session.notes,
      place: item.session.place,
      understanding: item.session.understanding,
      focus: item.session.focus,
    })),
  };
}

async function validateReportSessions(
  studentId: number,
  sessionIds: number[],
  instructorId: string,
) {
  if (sessionIds.length === 0) return [];
  const sessions = await prisma.lessonSession.findMany({
    where: {
      id: { in: sessionIds },
      studentId,
      student: { instructorId },
    },
    select: { id: true, start: true, end: true },
    orderBy: { start: "asc" },
  });
  if (sessions.length !== sessionIds.length) return null;
  return sessions;
}

function periodFromSessions(
  sessions: { start: Date; end: Date }[],
  periodStart: Date | null,
  periodEnd: Date | null,
) {
  return {
    periodStart: periodStart ?? sessions[0]?.start ?? null,
    periodEnd: periodEnd ?? sessions[sessions.length - 1]?.end ?? null,
  };
}

/**
 * GET /api/reports
 * 저장된 리포트 목록 조회. studentId query로 필터링 가능.
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const studentIdParam = parsePositiveInt(
      request.nextUrl.searchParams.get("studentId"),
      "studentId",
    );
    if (studentIdParam?.error) {
      return NextResponse.json({ error: studentIdParam.error }, { status: 400 });
    }

    const reports = await prisma.report.findMany({
      where: {
        student: studentAccessWhere(viewer),
        ...(studentIdParam?.value != null && {
          studentId: studentIdParam.value,
        }),
      },
      include: reportInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });

    return NextResponse.json(reports.map(serializeReport));
  } catch (e) {
    console.error("[GET /api/reports]", e);
    return NextResponse.json(
      { error: "리포트 목록을 불러오는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/reports
 * 생성된 리포트 초안을 저장합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const body = await request.json();
    const studentIdParam = parsePositiveInt(
      String(body.studentId ?? ""),
      "studentId",
    );
    if (studentIdParam?.error || studentIdParam?.value == null) {
      return NextResponse.json(
        { error: studentIdParam?.error ?? "studentId는 필수입니다." },
        { status: 400 },
      );
    }

    const status = normalizeStatus(body.status);
    if (!status) {
      return NextResponse.json(
        { error: "status는 draft 또는 sent여야 합니다." },
        { status: 400 },
      );
    }

    const sessionIds = normalizeSessionIds(body.sessionIds);
    if (!sessionIds || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "리포트에 포함할 sessionIds가 필요합니다." },
        { status: 400 },
      );
    }

    const periodStartParam = parseDate(body.periodStart, "periodStart");
    const periodEndParam = parseDate(body.periodEnd, "periodEnd");
    if (periodStartParam?.error) {
      return NextResponse.json(
        { error: periodStartParam.error },
        { status: 400 },
      );
    }
    if (periodEndParam?.error) {
      return NextResponse.json({ error: periodEndParam.error }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentIdParam.value, instructorId: instructor.userId },
      select: { id: true, name: true },
    });
    if (!student) {
      return NextResponse.json(
        { error: "존재하지 않는 학생입니다." },
        { status: 404 },
      );
    }

    const sessions = await validateReportSessions(
      student.id,
      sessionIds,
      instructor.userId,
    );
    if (!sessions) {
      return NextResponse.json(
        { error: "선택한 수업 중 학생에게 속하지 않는 수업이 있습니다." },
        { status: 400 },
      );
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : `${student.name} 리포트`;
    const period = periodFromSessions(
      sessions,
      periodStartParam?.value ?? null,
      periodEndParam?.value ?? null,
    );

    const report = await prisma.report.create({
      data: {
        studentId: student.id,
        title,
        status,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        summary: typeof body.summary === "string" ? body.summary : "",
        strengths: typeof body.strengths === "string" ? body.strengths : "",
        improvements:
          typeof body.improvements === "string" ? body.improvements : "",
        nextPlan: typeof body.nextPlan === "string" ? body.nextPlan : "",
        sessions: {
          create: sessionIds.map((sessionId) => ({
            sessionId,
          })),
        },
      },
      include: reportInclude,
    });

    return NextResponse.json(serializeReport(report), { status: 201 });
  } catch (e) {
    console.error("[POST /api/reports]", e);
    return NextResponse.json(
      { error: "리포트 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
