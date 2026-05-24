import { NextRequest, NextResponse } from "next/server";
import {
  requireInstructor,
  requireViewer,
  studentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/auth/roles";

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

function parseId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeSessionIds(value: unknown) {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return null;
  const ids = value.filter(
    (id): id is number => Number.isInteger(id) && Number(id) > 0,
  );
  return ids.length === value.length ? Array.from(new Set(ids)) : null;
}

function parseDate(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    return { error: `${field}는 ISO 날짜 문자열이어야 합니다.` };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `${field}는 유효한 날짜여야 합니다.` };
  }
  return { value: date };
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

async function findReport(
  id: number,
  viewer: { userId: string; role: UserRole },
) {
  return prisma.report.findFirst({
    where: {
      id,
      student: studentAccessWhere(viewer),
    },
    include: reportInclude,
  });
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

function periodFromSessions(sessions: { start: Date; end: Date }[]) {
  return {
    periodStart: sessions[0]?.start ?? null,
    periodEnd: sessions[sessions.length - 1]?.end ?? null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const id = parseId(params.id);
    if (!id) {
      return NextResponse.json(
        { error: "유효한 리포트 id가 아닙니다." },
        { status: 400 },
      );
    }

    const report = await findReport(id, viewer);
    if (!report) {
      return NextResponse.json(
        { error: "리포트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeReport(report));
  } catch (e) {
    console.error("[GET /api/reports/[id]]", e);
    return NextResponse.json(
      { error: "리포트 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const id = parseId(params.id);
    if (!id) {
      return NextResponse.json(
        { error: "유효한 리포트 id가 아닙니다." },
        { status: 400 },
      );
    }

    const existing = await prisma.report.findFirst({
      where: {
        id,
        student: { instructorId: instructor.userId },
      },
      select: { id: true, studentId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "리포트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const status = body.status;
    if (status != null && status !== "draft" && status !== "sent") {
      return NextResponse.json(
        { error: "status는 draft 또는 sent여야 합니다." },
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

    const sessionIds = normalizeSessionIds(body.sessionIds);
    if (sessionIds === null) {
      return NextResponse.json(
        { error: "sessionIds는 양의 정수 배열이어야 합니다." },
        { status: 400 },
      );
    }

    const sessions =
      sessionIds === undefined
        ? undefined
        : await validateReportSessions(
            existing.studentId,
            sessionIds,
            instructor.userId,
          );
    if (sessions === null) {
      return NextResponse.json(
        { error: "선택한 수업 중 학생에게 속하지 않는 수업이 있습니다." },
        { status: 400 },
      );
    }

    const inferredPeriod = sessions ? periodFromSessions(sessions) : null;
    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id },
        data: {
          ...(typeof body.title === "string" && {
            title: body.title.trim() || "제목 없는 리포트",
          }),
          ...(status != null && { status }),
          ...(periodStartParam !== undefined && {
            periodStart:
              periodStartParam && "value" in periodStartParam
                ? periodStartParam.value
                : null,
          }),
          ...(periodEndParam !== undefined && {
            periodEnd:
              periodEndParam && "value" in periodEndParam
                ? periodEndParam.value
                : null,
          }),
          ...(sessions &&
            periodStartParam === undefined && {
              periodStart: inferredPeriod?.periodStart,
            }),
          ...(sessions &&
            periodEndParam === undefined && {
              periodEnd: inferredPeriod?.periodEnd,
            }),
          ...(typeof body.summary === "string" && { summary: body.summary }),
          ...(typeof body.strengths === "string" && {
            strengths: body.strengths,
          }),
          ...(typeof body.improvements === "string" && {
            improvements: body.improvements,
          }),
          ...(typeof body.nextPlan === "string" && { nextPlan: body.nextPlan }),
        },
      });

      if (sessionIds !== undefined) {
        await tx.reportSession.deleteMany({ where: { reportId: id } });
        if (sessionIds.length > 0) {
          await tx.reportSession.createMany({
            data: sessionIds.map((sessionId) => ({ reportId: id, sessionId })),
          });
        }
      }
    });

    const updated = await findReport(id, {
      userId: instructor.userId,
      role: "instructor",
    });
    if (!updated) {
      return NextResponse.json(
        { error: "리포트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeReport(updated));
  } catch (e) {
    console.error("[PATCH /api/reports/[id]]", e);
    return NextResponse.json(
      { error: "리포트 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const id = parseId(params.id);
    if (!id) {
      return NextResponse.json(
        { error: "유효한 리포트 id가 아닙니다." },
        { status: 400 },
      );
    }

    const existing = await prisma.report.findFirst({
      where: {
        id,
        student: { instructorId: instructor.userId },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "리포트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await prisma.report.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[DELETE /api/reports/[id]]", e);
    return NextResponse.json(
      { error: "리포트 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
