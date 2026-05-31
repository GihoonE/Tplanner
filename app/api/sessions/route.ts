import { NextResponse, NextRequest } from "next/server";
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

/**
 * GET /api/sessions
 * 전체 수업 목록 (homework 포함). 단건은 GET /api/sessions/[id].
 */
export async function GET() {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const sessions = await prisma.lessonSession.findMany({
      where: {
        student: sessionStudentAccessWhere(viewer),
      },
      include: { homework: true },
      orderBy: { start: "desc" },
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
      })),
    );
  } catch (error) {
    console.error("[GET /api/sessions]", error);
    return NextResponse.json(
      { error: "수업 목록을 불러오는 데 실패했습니다." },
      { status: 500 },
    );
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
    const {
      studentId,
      start,
      end,
      place,
      notes,
      understanding,
      focus,
      homework,
    } = body;

    if (studentId == null || studentId === "" || !start || !end) {
      return NextResponse.json(
        { error: "studentId, start, end는 필수입니다." },
        { status: 400 },
      );
    }

    const sidParam = parsePositiveInt(String(studentId).trim(), "studentId");
    if (!sidParam.ok) {
      return NextResponse.json({ error: sidParam.error }, { status: 400 });
    }
    const sidNum = sidParam.value;

    const startAt = new Date(start);
    const endAt = new Date(end);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json(
        { error: "start, end는 유효한 날짜 형식이어야 합니다." },
        { status: 400 },
      );
    }
    if (endAt <= startAt) {
      return NextResponse.json(
        { error: "종료 시각(end)은 시작 시각(start)보다 이후여야 합니다." },
        { status: 400 },
      );
    }

    const placeParam = parseOptionalString(place, "place");
    if (!placeParam.ok) {
      return NextResponse.json({ error: placeParam.error }, { status: 400 });
    }
    const notesParam = parseOptionalString(notes, "notes");
    if (!notesParam.ok) {
      return NextResponse.json({ error: notesParam.error }, { status: 400 });
    }
    const understandingParam = parseUnderstanding(understanding ?? "");
    if (!understandingParam.ok) {
      return NextResponse.json(
        { error: understandingParam.error },
        { status: 400 },
      );
    }
    const focusParam = parseFocus(focus ?? "");
    if (!focusParam.ok) {
      return NextResponse.json({ error: focusParam.error }, { status: 400 });
    }

    const studentRow = await prisma.student.findFirst({
      where: { id: sidNum, instructorId: instructor.userId },
      select: { id: true },
    });
    if (!studentRow) {
      return NextResponse.json(
        { error: "존재하지 않는 학생입니다." },
        { status: 400 },
      );
    }

    const session = await prisma.lessonSession.create({
      data: {
        studentId: sidNum,
        start: startAt,
        end: endAt,
        // 변수 ?? 대체제 -> 변수가 null/undefined면 오른쪽에 지정한 값 사용
        place: placeParam.value ?? "",
        notes: notesParam.value ?? "",
        understanding: understandingParam.value,
        focus: focusParam.value,
      },
    });

    if (Array.isArray(homework) && homework.length > 0) {
      // homework 배열을 한번에 여러개 짚어 넣기
      await prisma.homeworkItem.createMany({
        // homework의 요소 중 text, done의 타입 지정
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

    if (!s) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
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
    });
  } catch (e) {
    console.error("[POST /api/sessions]", e);
    return NextResponse.json(
      { error: "수업 기록 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
