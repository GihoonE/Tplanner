import { NextRequest, NextResponse } from "next/server";
import {
  requireInstructor,
  sessionStudentAccessWhere,
} from "@/lib/auth/permissions";
import {
  parseFocus,
  parseOptionalDate,
  parseOptionalFocus,
  parseOptionalString,
  parseOptionalUnderstanding,
  parsePositiveInt,
  parseUnderstanding,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";

type BatchResult<T = unknown> = {
  sessionId?: number;
  clientId?: number;
  success: boolean;
  error?: string;
  session?: T;
};

function serializeSession(s: {
  id: number;
  studentId: number | null;
  start: Date;
  end: Date;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  version: number;
  homework: { id: number; text: string; done: boolean }[];
}) {
  return {
    id: s.id,
    studentId: s.studentId,
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    place: s.place,
    notes: s.notes,
    understanding: s.understanding,
    focus: s.focus,
    version: s.version,
    homework: s.homework.map((h) => ({
      id: h.id,
      text: h.text,
      done: h.done,
    })),
  };
}

async function loadSession(id: number, instructorId: string) {
  return prisma.lessonSession.findFirst({
    where: {
      id,
      student: { instructorId },
    },
    include: { homework: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const body = await request.json();
    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";
    const items = Array.isArray(body?.sessions) ? body.sessions : [];

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "idempotencyKey는 필수입니다." },
        { status: 400 },
      );
    }
    if (items.length === 0) {
      return NextResponse.json(
        { error: "생성할 수업이 없습니다." },
        { status: 400 },
      );
    }

    const cached = await prisma.sessionBatchCreateRequest.findUnique({
      where: { key: idempotencyKey },
    });
    if (cached) {
      return NextResponse.json(cached.response);
    }

    const results: BatchResult<ReturnType<typeof serializeSession>>[] = [];
    for (const item of items) {
      const clientId =
        typeof item?.clientId === "number" ? item.clientId : undefined;
      try {
        const sidParam = parsePositiveInt(String(item?.studentId ?? ""), "studentId");
        if (!sidParam.ok) throw new Error(sidParam.error);
        const start = new Date(item?.start);
        const end = new Date(item?.end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          throw new Error("start, end는 유효한 날짜 형식이어야 합니다.");
        }
        if (end <= start) {
          throw new Error("종료 시각(end)은 시작 시각(start)보다 이후여야 합니다.");
        }
        const placeParam = parseOptionalString(item?.place, "place");
        if (!placeParam.ok) throw new Error(placeParam.error);
        const notesParam = parseOptionalString(item?.notes, "notes");
        if (!notesParam.ok) throw new Error(notesParam.error);
        const understandingParam = parseUnderstanding(item?.understanding ?? "");
        if (!understandingParam.ok) throw new Error(understandingParam.error);
        const focusParam = parseFocus(item?.focus ?? "");
        if (!focusParam.ok) throw new Error(focusParam.error);

        const student = await prisma.student.findFirst({
          where: { id: sidParam.value, instructorId: instructor.userId },
          select: { id: true },
        });
        if (!student) throw new Error("존재하지 않는 학생입니다.");

        const created = await prisma.$transaction(async (tx) => {
          const session = await tx.lessonSession.create({
            data: {
              studentId: sidParam.value,
              start,
              end,
              place: placeParam.value ?? "",
              notes: notesParam.value ?? "",
              understanding: understandingParam.value,
              focus: focusParam.value,
            },
          });
          const homework = Array.isArray(item?.homework) ? item.homework : [];
          if (homework.length > 0) {
            await tx.homeworkItem.createMany({
              data: homework
                .filter((h: { text?: unknown }) => typeof h.text === "string")
                .map((h: { text: string; done?: boolean }) => ({
                  sessionId: session.id,
                  text: h.text,
                  done: h.done ?? false,
                })),
            });
          }
          return tx.lessonSession.findUniqueOrThrow({
            where: { id: session.id },
            include: { homework: true },
          });
        });
        results.push({
          clientId,
          sessionId: created.id,
          success: true,
          session: serializeSession(created),
        });
      } catch (error) {
        results.push({
          clientId,
          success: false,
          error: error instanceof Error ? error.message : "수업 생성 실패",
        });
      }
    }

    const response = { results };
    await prisma.sessionBatchCreateRequest.create({
      data: {
        key: idempotencyKey,
        userId: instructor.userId,
        response,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[POST /api/sessions/batch]", error);
    return NextResponse.json(
      { error: "수업 일괄 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const body = await request.json();
    const items = Array.isArray(body?.sessions) ? body.sessions : [];
    const results: BatchResult<ReturnType<typeof serializeSession>>[] = [];

    for (const item of items) {
      const idParam = parsePositiveInt(String(item?.id ?? ""), "id");
      if (!idParam.ok) {
        results.push({ success: false, error: idParam.error });
        continue;
      }

      try {
        const existing = await prisma.lessonSession.findFirst({
          where: {
            id: idParam.value,
            student: sessionStudentAccessWhere({
              userId: instructor.userId,
              role: "instructor",
            }),
          },
          select: { id: true, start: true, end: true },
        });
        if (!existing) throw new Error("수업을 찾을 수 없습니다.");

        const placeParam = parseOptionalString(item?.place, "place");
        if (!placeParam.ok) throw new Error(placeParam.error);
        const notesParam = parseOptionalString(item?.notes, "notes");
        if (!notesParam.ok) throw new Error(notesParam.error);
        const understandingParam = parseOptionalUnderstanding(item?.understanding);
        if (!understandingParam.ok) throw new Error(understandingParam.error);
        const focusParam = parseOptionalFocus(item?.focus);
        if (!focusParam.ok) throw new Error(focusParam.error);
        const startParam = parseOptionalDate(item?.start, "start");
        if (!startParam.ok) throw new Error(startParam.error);
        const endParam = parseOptionalDate(item?.end, "end");
        if (!endParam.ok) throw new Error(endParam.error);

        const nextStart = startParam.value ?? existing.start;
        const nextEnd = endParam.value ?? existing.end;
        if (nextEnd <= nextStart) {
          throw new Error("종료 시각(end)은 시작 시각(start)보다 이후여야 합니다.");
        }

        await prisma.lessonSession.update({
          where: { id: idParam.value },
          data: {
            ...(placeParam.value !== undefined && { place: placeParam.value }),
            ...(notesParam.value !== undefined && { notes: notesParam.value }),
            ...(understandingParam.value !== undefined && {
              understanding: understandingParam.value,
            }),
            ...(focusParam.value !== undefined && { focus: focusParam.value }),
            ...(startParam.value !== undefined && { start: startParam.value }),
            ...(endParam.value !== undefined && { end: endParam.value }),
            version: { increment: 1 },
          },
        });
        const updated = await loadSession(idParam.value, instructor.userId);
        if (!updated) throw new Error("수업을 찾을 수 없습니다.");
        results.push({
          sessionId: updated.id,
          success: true,
          session: serializeSession(updated),
        });
      } catch (error) {
        results.push({
          sessionId: idParam.value,
          success: false,
          error: error instanceof Error ? error.message : "수업 수정 실패",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[PATCH /api/sessions/batch]", error);
    return NextResponse.json(
      { error: "수업 일괄 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const results: BatchResult[] = [];

    for (const rawId of ids) {
      const idParam = parsePositiveInt(String(rawId), "id");
      if (!idParam.ok) {
        results.push({ success: false, error: idParam.error });
        continue;
      }

      try {
        const existing = await prisma.lessonSession.findFirst({
          where: {
            id: idParam.value,
            student: { instructorId: instructor.userId },
          },
          select: { id: true },
        });
        if (!existing) throw new Error("수업을 찾을 수 없습니다.");
        await prisma.lessonSession.delete({ where: { id: idParam.value } });
        results.push({ sessionId: idParam.value, success: true });
      } catch (error) {
        results.push({
          sessionId: idParam.value,
          success: false,
          error: error instanceof Error ? error.message : "수업 삭제 실패",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[DELETE /api/sessions/batch]", error);
    return NextResponse.json(
      { error: "수업 일괄 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
