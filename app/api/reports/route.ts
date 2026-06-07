import { NextRequest } from "next/server";
import {
  requireInstructor,
  requireViewer,
  studentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import {
  serializeReport,
  reportInclude,
} from "@/lib/api/serializers";
import {
  parseReportDate,
  normalizeSessionIds,
  validateReportSessions,
  periodFromSessions,
} from "@/lib/api/reportHelpers";
import { ok, err } from "@/lib/api/response";

function parseOptionalPositiveInt(value: string | null, field: string) {
  if (value == null || value === "") return null;
  if (!/^\d+$/.test(value)) return { error: `${field}는 양의 정수여야 합니다.` };
  const num = Number(value);
  if (!Number.isSafeInteger(num) || num < 1) return { error: `${field}는 양의 정수여야 합니다.` };
  return { value: num };
}

function normalizeStatus(value: unknown) {
  if (value == null || value === "") return "draft";
  return value === "draft" || value === "sent" ? value : null;
}

/**
 * GET /api/reports
 * 저장된 리포트 목록 조회. studentId query로 필터링 가능.
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const studentIdParam = parseOptionalPositiveInt(
      request.nextUrl.searchParams.get("studentId"),
      "studentId",
    );
    if (studentIdParam?.error) return err(studentIdParam.error, 400);

    const reports = await prisma.report.findMany({
      where: {
        student: studentAccessWhere(viewer),
        ...(studentIdParam?.value != null && { studentId: studentIdParam.value }),
      },
      include: reportInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });

    return ok(reports.map(serializeReport));
  } catch (e) {
    console.error("[GET /api/reports]", e);
    return err("리포트 목록을 불러오는 데 실패했습니다.", 500);
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
    const studentIdParam = parseOptionalPositiveInt(String(body.studentId ?? ""), "studentId");
    if (studentIdParam?.error || studentIdParam?.value == null) {
      return err(studentIdParam?.error ?? "studentId는 필수입니다.", 400);
    }

    const status = normalizeStatus(body.status);
    if (!status) return err("status는 draft 또는 sent여야 합니다.", 400);

    const sessionIds = normalizeSessionIds(body.sessionIds);
    if (!sessionIds || sessionIds.length === 0) {
      return err("리포트에 포함할 sessionIds가 필요합니다.", 400);
    }

    const periodStartParam = parseReportDate(body.periodStart, "periodStart");
    if (periodStartParam?.error) return err(periodStartParam.error, 400);
    const periodEndParam = parseReportDate(body.periodEnd, "periodEnd");
    if (periodEndParam?.error) return err(periodEndParam.error, 400);

    const student = await prisma.student.findFirst({
      where: { id: studentIdParam.value, instructorId: instructor.userId },
      select: { id: true, name: true },
    });
    if (!student) return err("존재하지 않는 학생입니다.", 404);

    const sessions = await validateReportSessions(
      student.id,
      sessionIds,
      instructor.userId,
    );
    if (!sessions) {
      return err("선택한 수업 중 학생에게 속하지 않는 수업이 있습니다.", 400);
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
        improvements: typeof body.improvements === "string" ? body.improvements : "",
        nextPlan: typeof body.nextPlan === "string" ? body.nextPlan : "",
        sessions: {
          create: sessionIds.map((sessionId) => ({ sessionId })),
        },
      },
      include: reportInclude,
    });

    return ok(serializeReport(report), 201);
  } catch (e) {
    console.error("[POST /api/reports]", e);
    return err("리포트 저장에 실패했습니다.", 500);
  }
}
