import { NextRequest } from "next/server";
import {
  requireInstructor,
  requireViewer,
  studentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/auth/roles";
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
import { parseRouteId } from "@/lib/api/validation";
import { ok, err } from "@/lib/api/response";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err("유효한 리포트 id가 아닙니다.", 400);

    const report = await findReport(idParam.value, viewer);
    if (!report) return err("리포트를 찾을 수 없습니다.", 404);
    return ok(serializeReport(report));
  } catch (e) {
    console.error("[GET /api/reports/[id]]", e);
    return err("리포트 조회에 실패했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err("유효한 리포트 id가 아닙니다.", 400);
    const id = idParam.value;

    const existing = await prisma.report.findFirst({
      where: {
        id,
        student: { instructorId: instructor.userId },
      },
      select: { id: true, studentId: true },
    });
    if (!existing) return err("리포트를 찾을 수 없습니다.", 404);

    const body = await request.json();
    const status = body.status;
    if (status != null && status !== "draft" && status !== "sent") {
      return err("status는 draft 또는 sent여야 합니다.", 400);
    }

    const periodStartParam = parseReportDate(body.periodStart, "periodStart");
    if (periodStartParam?.error) return err(periodStartParam.error, 400);
    const periodEndParam = parseReportDate(body.periodEnd, "periodEnd");
    if (periodEndParam?.error) return err(periodEndParam.error, 400);

    const sessionIds = normalizeSessionIds(body.sessionIds);
    if (sessionIds === null) {
      return err("sessionIds는 양의 정수 배열이어야 합니다.", 400);
    }

    const sessions =
      sessionIds === undefined
        ? undefined
        : await validateReportSessions(existing.studentId, sessionIds, instructor.userId);
    if (sessions === null) {
      return err("선택한 수업 중 학생에게 속하지 않는 수업이 있습니다.", 400);
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
          ...(sessions && periodStartParam === undefined && {
            periodStart: inferredPeriod?.periodStart,
          }),
          ...(sessions && periodEndParam === undefined && {
            periodEnd: inferredPeriod?.periodEnd,
          }),
          ...(typeof body.summary === "string" && { summary: body.summary }),
          ...(typeof body.strengths === "string" && { strengths: body.strengths }),
          ...(typeof body.improvements === "string" && { improvements: body.improvements }),
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

    const updated = await findReport(id, { userId: instructor.userId, role: "instructor" });
    if (!updated) return err("리포트를 찾을 수 없습니다.", 404);
    return ok(serializeReport(updated));
  } catch (e) {
    console.error("[PATCH /api/reports/[id]]", e);
    return err("리포트 수정에 실패했습니다.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err("유효한 리포트 id가 아닙니다.", 400);
    const id = idParam.value;

    const existing = await prisma.report.findFirst({
      where: {
        id,
        student: { instructorId: instructor.userId },
      },
      select: { id: true },
    });
    if (!existing) return err("리포트를 찾을 수 없습니다.", 404);

    await prisma.report.delete({ where: { id } });
    return ok({ ok: true, id });
  } catch (e) {
    console.error("[DELETE /api/reports/[id]]", e);
    return err("리포트 삭제에 실패했습니다.", 500);
  }
}
