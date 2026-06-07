import { NextRequest } from "next/server";
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
  parseRouteId,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { serializeSession } from "@/lib/api/serializers";
import { ok, err } from "@/lib/api/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err(idParam.error, 400);

    const s = await prisma.lessonSession.findFirst({
      where: {
        id: idParam.value,
        student: sessionStudentAccessWhere(viewer),
      },
      include: { homework: true },
    });
    if (!s) return err("수업을 찾을 수 없습니다.", 404);
    return ok(serializeSession(s));
  } catch (e) {
    console.error("[GET] /api/sessions/[id]", e);
    return err("수업 기록을 조회하는 데 실패했습니다.", 500);
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err(idParam.error, 400);
    const numId = idParam.value;

    const existing = await prisma.lessonSession.findFirst({
      where: {
        id: numId,
        student: { instructorId: instructor.userId },
      },
      select: { id: true, start: true, end: true },
    });
    if (!existing) return err("수업을 찾을 수 없습니다.", 404);

    const body = await _req.json();
    const { place, notes, understanding, focus, start, end } = body;
    const placeParam = parseOptionalString(place, "place");
    if (!placeParam.ok) return err(placeParam.error, 400);
    const notesParam = parseOptionalString(notes, "notes");
    if (!notesParam.ok) return err(notesParam.error, 400);
    const understandingParam = parseOptionalUnderstanding(understanding);
    if (!understandingParam.ok) return err(understandingParam.error, 400);
    const focusParam = parseOptionalFocus(focus);
    if (!focusParam.ok) return err(focusParam.error, 400);
    const startParam = parseOptionalDate(start, "start");
    if (!startParam.ok) return err(startParam.error, 400);
    const endParam = parseOptionalDate(end, "end");
    if (!endParam.ok) return err(endParam.error, 400);

    const nextStart = startParam.value ?? existing.start;
    const nextEnd = endParam.value ?? existing.end;
    if (nextEnd <= nextStart) {
      return err("종료 시각(end)은 시작 시각(start)보다 이후여야 합니다.", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.lessonSession.update({
        where: { id: numId },
        data: {
          ...(placeParam.value !== undefined && { place: placeParam.value }),
          ...(notesParam.value !== undefined && { notes: notesParam.value }),
          ...(understandingParam.value !== undefined && { understanding: understandingParam.value }),
          ...(focusParam.value !== undefined && { focus: focusParam.value }),
          ...(startParam.value !== undefined && { start: startParam.value }),
          ...(endParam.value !== undefined && { end: endParam.value }),
          version: { increment: 1 },
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
    if (!updated) return err("Not found", 404);
    return ok(serializeSession(updated));
  } catch (e) {
    console.error("[PATCH] /api/sessions/[id]", e);
    return err("수업 기록 수정에 실패했습니다.", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err(idParam.error, 400);

    const existing = await prisma.lessonSession.findFirst({
      where: {
        id: idParam.value,
        student: { instructorId: instructor.userId },
      },
      select: { id: true },
    });
    if (!existing) return err("수업을 찾을 수 없습니다.", 404);

    const s = await prisma.lessonSession.delete({
      where: { id: idParam.value },
    });
    return ok({
      id: s.id,
      studentId: s.studentId,
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      place: s.place,
      notes: s.notes,
      understanding: s.understanding,
      focus: s.focus,
      version: s.version,
      homework: [],
    });
  } catch (e) {
    console.error("[DELETE /api/sessions/[id]]", e);
    return err("수업 기록을 삭제하는 데 실패했습니다.", 500);
  }
}
