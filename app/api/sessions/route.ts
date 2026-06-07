import { NextRequest } from "next/server";
import {
  requireInstructor,
  requireViewer,
  sessionStudentAccessWhere,
} from "@/lib/auth/permissions";
import {
  parseFocus,
  parseOptionalString,
  parsePositiveInt,
  parseUnderstanding,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { serializeSession } from "@/lib/api/serializers";
import { ok, err } from "@/lib/api/response";

/**
 * GET /api/sessions?from=ISO&to=ISO
 * Session list with homework. Optional from/to narrow the date window.
 * Records page omits from/to to fetch everything; dashboard passes a range.
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const { searchParams } = request.nextUrl;
    const fromRaw = searchParams.get("from");
    const toRaw   = searchParams.get("to");
    const from    = fromRaw ? new Date(fromRaw) : null;
    const to      = toRaw   ? new Date(toRaw)   : null;

    if (from && Number.isNaN(from.getTime())) {
      return err("from은 유효한 날짜여야 합니다.", 400);
    }
    if (to && Number.isNaN(to.getTime())) {
      return err("to은 유효한 날짜여야 합니다.", 400);
    }

    const sessions = await prisma.lessonSession.findMany({
      where: {
        student: sessionStudentAccessWhere(viewer),
        ...(from && to ? { start: { gte: from, lt: to } } : {}),
      },
      include: { homework: true },
      orderBy: { start: "desc" },
    });

    return ok(sessions.map(serializeSession));
  } catch (error) {
    console.error("[GET /api/sessions]", error);
    return err("수업 목록을 불러오는 데 실패했습니다.", 500);
  }
}

/**
 * POST /api/sessions
 * 새 수업 생성 (클라이언트가 studentId, start, end 등을 body로 보냄)
 */
export async function POST(_req: NextRequest) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const body = await _req.json();
    const { studentId, start, end, place, notes, understanding, focus, homework } = body;

    if (studentId == null || studentId === "" || !start || !end) {
      return err("studentId, start, end는 필수입니다.", 400);
    }

    const sidParam = parsePositiveInt(String(studentId).trim(), "studentId");
    if (!sidParam.ok) return err(sidParam.error, 400);
    const sidNum = sidParam.value;

    const startAt = new Date(start);
    const endAt = new Date(end);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return err("start, end는 유효한 날짜 형식이어야 합니다.", 400);
    }
    if (endAt <= startAt) {
      return err("종료 시각(end)은 시작 시각(start)보다 이후여야 합니다.", 400);
    }

    const placeParam = parseOptionalString(place, "place");
    if (!placeParam.ok) return err(placeParam.error, 400);
    const notesParam = parseOptionalString(notes, "notes");
    if (!notesParam.ok) return err(notesParam.error, 400);
    const understandingParam = parseUnderstanding(understanding ?? "");
    if (!understandingParam.ok) return err(understandingParam.error, 400);
    const focusParam = parseFocus(focus ?? "");
    if (!focusParam.ok) return err(focusParam.error, 400);

    const studentRow = await prisma.student.findFirst({
      where: { id: sidNum, instructorId: instructor.userId },
      select: { id: true },
    });
    if (!studentRow) return err("존재하지 않는 학생입니다.", 400);

    const session = await prisma.lessonSession.create({
      data: {
        studentId: sidNum,
        start: startAt,
        end: endAt,
        place: placeParam.value ?? "",
        notes: notesParam.value ?? "",
        understanding: understandingParam.value,
        focus: focusParam.value,
      },
    });

    if (Array.isArray(homework) && homework.length > 0) {
      await prisma.homeworkItem.createMany({
        data: homework.map((h: { text: string; done?: boolean }) => ({
          sessionId: session.id,
          text: h.text,
          done: h.done ?? false,
        })),
      });
    }

    const s = await prisma.lessonSession.findFirst({
      where: { id: session.id },
      include: { homework: true },
    });

    if (!s) return err("Not found", 404);
    return ok(serializeSession(s));
  } catch (e) {
    console.error("[POST /api/sessions]", e);
    return err("수업 기록 생성에 실패했습니다.", 500);
  }
}
