import { NextResponse, NextRequest } from "next/server";
import {
  requireInstructor,
  requireViewer,
  sessionStudentAccessWhere,
} from "@/lib/auth/permissions";
import {
  parseOptionalDate,
  parseOptionalFocus,
  parseOptionalString,
  parseOptionalUnderstanding,
  parsePositiveInt,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";

// id로 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const idParam = parsePositiveInt(params.id, "id");
    if (!idParam.ok) {
      return NextResponse.json({ error: idParam.error }, { status: 400 });
    }

    const s = await prisma.lessonSession.findFirst({
      where: {
        id: idParam.value,
        student: sessionStudentAccessWhere(viewer),
      },
      include: { homework: true },
    });
    if (!s) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없습니다." },
        { status: 404 },
      );
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
    console.error("[GET] /api/sessions/[id]", e);
    return NextResponse.json(
      { error: "수업 기록을 조회하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

// id로 수정
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parsePositiveInt(params.id, "id");
    if (!idParam.ok) {
      return NextResponse.json({ error: idParam.error }, { status: 400 });
    }
    const numId = idParam.value;

    const existing = await prisma.lessonSession.findFirst({
      where: {
        id: numId,
        student: { instructorId: instructor.userId },
      },
      select: { id: true, start: true, end: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await _req.json();
    const { place, notes, understanding, focus, start, end } = body;
    const placeParam = parseOptionalString(place, "place");
    if (!placeParam.ok) {
      return NextResponse.json({ error: placeParam.error }, { status: 400 });
    }
    const notesParam = parseOptionalString(notes, "notes");
    if (!notesParam.ok) {
      return NextResponse.json({ error: notesParam.error }, { status: 400 });
    }
    const understandingParam = parseOptionalUnderstanding(understanding);
    if (!understandingParam.ok) {
      return NextResponse.json(
        { error: understandingParam.error },
        { status: 400 },
      );
    }
    const focusParam = parseOptionalFocus(focus);
    if (!focusParam.ok) {
      return NextResponse.json({ error: focusParam.error }, { status: 400 });
    }
    const startParam = parseOptionalDate(start, "start");
    if (!startParam.ok) {
      return NextResponse.json({ error: startParam.error }, { status: 400 });
    }
    const endParam = parseOptionalDate(end, "end");
    if (!endParam.ok) {
      return NextResponse.json({ error: endParam.error }, { status: 400 });
    }

    const nextStart = startParam.value ?? existing.start;
    const nextEnd = endParam.value ?? existing.end;
    if (nextEnd <= nextStart) {
      return NextResponse.json(
        { error: "종료 시각(end)은 시작 시각(start)보다 이후여야 합니다." },
        { status: 400 },
      );
    }

    //transaction: 실패시 롤백 진행
    await prisma.$transaction(async (tx) => {
      await tx.lessonSession.update({
        where: { id: numId },
        data: {
          // ...(조건 && {key:value})
          // 조건 만족 시 값이 들어감
          ...(placeParam.value !== undefined && { place: placeParam.value }),
          ...(notesParam.value !== undefined && { notes: notesParam.value }),
          ...(understandingParam.value !== undefined && {
            understanding: understandingParam.value,
          }),
          ...(focusParam.value !== undefined && { focus: focusParam.value }),
          ...(startParam.value !== undefined && { start: startParam.value }),
          ...(endParam.value !== undefined && { end: endParam.value }),
        },
      });
    });

    const updated = await prisma.lessonSession.findFirst({
      where: {
        id: numId,
        student: { instructorId: instructor.userId },
      },
      include: { homework: true },
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: updated.id,
      studentId: updated.studentId,
      start: updated.start.toISOString(),
      end: updated.end.toISOString(),
      place: updated.place,
      notes: updated.notes,
      understanding: updated.understanding,
      focus: updated.focus,
      homework: updated.homework.map((h) => ({
        id: h.id,
        text: h.text,
        done: h.done,
      })),
    });
  } catch (e) {
    console.error("[PATCH] /api/sessions/[id]", e);
    return NextResponse.json(
      { error: "수업 기록 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// sessionId로 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parsePositiveInt(params.id, "id");
    if (!idParam.ok) {
      return NextResponse.json({ error: idParam.error }, { status: 400 });
    }

    const existing = await prisma.lessonSession.findFirst({
      where: {
        id: idParam.value,
        student: { instructorId: instructor.userId },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const s = await prisma.lessonSession.delete({
      where: { id: idParam.value },
    });
    return NextResponse.json({
      id: s.id,
      studentId: s.studentId,
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      place: s.place,
      notes: s.notes,
      understanding: s.understanding,
      focus: s.focus,
      homework: [],
    });
  } catch (e) {
    console.error("[DELETE /api/sessions/[id]]", e);
    return NextResponse.json(
      { error: "수업 기록을 삭제하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}
