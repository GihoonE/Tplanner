import { NextRequest, NextResponse } from "next/server";
import {
  requireViewer,
  sessionStudentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseDateParam(value: string | null, field: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `${field}는 유효한 날짜여야 합니다.` };
  }
  return { value: date };
}

/**
 * GET /api/calendar/sessions
 * Calendar-only session lookup. Returns sessions overlapping [from, to].
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const { searchParams } = request.nextUrl;
    const fromParam = parseDateParam(searchParams.get("from"), "from");
    const toParam = parseDateParam(searchParams.get("to"), "to");

    if (fromParam?.error) {
      return NextResponse.json({ error: fromParam.error }, { status: 400 });
    }
    if (toParam?.error) {
      return NextResponse.json({ error: toParam.error }, { status: 400 });
    }

    const from = fromParam?.value;
    const to = toParam?.value;
    if (from && to && to <= from) {
      return NextResponse.json(
        { error: "to는 from보다 이후여야 합니다." },
        { status: 400 },
      );
    }

    const sessions = await prisma.lessonSession.findMany({
      where: {
        student: sessionStudentAccessWhere(viewer),
        ...(from && to
          ? {
              start: { lt: to },
              end: { gt: from },
            }
          : {}),
      },
      include: {
        homework: true,
        student: {
          select: {
            id: true,
            name: true,
            subject: true,
            grade: true,
            school: true,
            color: true,
            avatarChar: true,
            status: true,
            startDate: true,
            totalSessions: true,
            hwCompletionRate: true,
          },
        },
      },
      orderBy: { start: "asc" },
    });

    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        place: s.place,
        notes: s.notes,
        understanding: s.understanding,
        focus: s.focus,
        homework: s.homework.map((h) => ({
          id: h.id,
          text: h.text,
          done: h.done,
        })),
        student: s.student,
      })),
    );
  } catch (e) {
    console.error("[GET /api/calendar/sessions]", e);
    return NextResponse.json(
      { error: "캘린더 수업 목록을 불러오는 데 실패했습니다." },
      { status: 500 },
    );
  }
}
