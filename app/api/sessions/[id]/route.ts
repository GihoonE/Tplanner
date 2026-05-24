import { NextResponse, NextRequest } from "next/server";
import {
  requireInstructor,
  requireViewer,
  sessionStudentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

// id로 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const { id } = params;
    const s = await prisma.lessonSession.findFirst({
      where: {
        id: parseInt(id, 10),
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

    const { id } = params;
    const numId = parseInt(id, 10);
    if (!Number.isFinite(numId) || numId < 1) {
      return NextResponse.json(
        { error: "유효한 수업 id가 아닙니다." },
        { status: 400 },
      );
    }

    const existing = await prisma.lessonSession.findFirst({
      where: {
        id: numId,
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

    const body = await _req.json();
    const { place, notes, understanding, focus, start, end } = body;

    //transaction: 실패시 롤백 진행
    await prisma.$transaction(async (tx) => {
      await tx.lessonSession.update({
        where: { id: numId },
        data: {
          // ...(조건 && {key:value})
          // 조건 만족 시 값이 들어감
          ...(place != null && { place }),
          ...(notes != null && { notes }),
          ...(understanding != null && { understanding }),
          ...(focus != null && { focus }),
          ...(start != null && { start }),
          ...(end != null && { end }),
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

    const { id } = params;
    const existing = await prisma.lessonSession.findFirst({
      where: {
        id: parseInt(id, 10),
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
      where: { id: parseInt(id, 10) },
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
