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
import { serializeSession } from "@/lib/api/serializers";

type BatchResult<T = unknown> = {
  sessionId?: number;
  clientId?: number;
  success: boolean;
  error?: string;
  session?: T;
};

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

    // Clean up idempotency records older than 24 hours (fire-and-forget).
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    prisma.sessionBatchCreateRequest
      .deleteMany({ where: { createdAt: { lt: yesterday } } })
      .catch(() => {});

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
    if (idempotencyKey.length > 128 || !/^[\w-]+$/.test(idempotencyKey)) {
      return NextResponse.json(
        { error: "idempotencyKey 형식이 올바르지 않습니다. (최대 128자, 영문/숫자/-/_)" },
        { status: 400 },
      );
    }
    if (items.length === 0) {
      return NextResponse.json(
        { error: "생성할 수업이 없습니다." },
        { status: 400 },
      );
    }
    if (items.length > 100) {
      return NextResponse.json(
        { error: "한 번에 최대 100개까지 처리할 수 있습니다." },
        { status: 400 },
      );
    }

    const cached = await prisma.sessionBatchCreateRequest.findUnique({
      where: { key: idempotencyKey, userId: instructor.userId },
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

    if (items.length === 0) {
      return NextResponse.json({ results: [] });
    }
    if (items.length > 100) {
      return NextResponse.json(
        { error: "한 번에 최대 100개까지 처리할 수 있습니다." },
        { status: 400 },
      );
    }

    // ── Step 1: validate inputs, build update data per item ───────────────────
    type ValidatedItem = {
      id: number;
      data: Record<string, unknown>;
    };

    const validItems: ValidatedItem[] = [];
    const earlyErrors: BatchResult<ReturnType<typeof serializeSession>>[] = [];

    for (const item of items) {
      const idParam = parsePositiveInt(String(item?.id ?? ""), "id");
      if (!idParam.ok) {
        earlyErrors.push({ success: false, error: idParam.error });
        continue;
      }

      try {
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

        validItems.push({
          id: idParam.value,
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
      } catch (error) {
        earlyErrors.push({
          sessionId: idParam.value,
          success: false,
          error: error instanceof Error ? error.message : "수업 수정 실패",
        });
      }
    }

    if (validItems.length === 0) {
      return NextResponse.json({ results: earlyErrors });
    }

    // ── Step 2: batch ownership check ─────────────────────────────────────────
    const validIds = validItems.map((item) => item.id);
    const ownedSessions = await prisma.lessonSession.findMany({
      where: {
        id: { in: validIds },
        student: { instructorId: instructor.userId },
      },
      select: { id: true, start: true, end: true },
    });
    const ownedIds = new Set(ownedSessions.map((s) => s.id));
    const ownedMap = new Map(ownedSessions.map((s) => [s.id, s]));

    const notOwnedErrors: BatchResult<ReturnType<typeof serializeSession>>[] =
      validItems
        .filter((item) => !ownedIds.has(item.id))
        .map((item) => ({
          sessionId: item.id,
          success: false,
          error: "수업을 찾을 수 없습니다.",
        }));

    const ownedItems = validItems.filter((item) => ownedIds.has(item.id));

    // Validate start/end consistency against existing values
    const timeErrors: BatchResult<ReturnType<typeof serializeSession>>[] = [];
    const finalItems: ValidatedItem[] = [];
    for (const item of ownedItems) {
      const existing = ownedMap.get(item.id)!;
      const nextStart = (item.data.start as Date | undefined) ?? existing.start;
      const nextEnd   = (item.data.end   as Date | undefined) ?? existing.end;
      if (nextEnd <= nextStart) {
        timeErrors.push({
          sessionId: item.id,
          success: false,
          error: "종료 시각(end)은 시작 시각(start)보다 이후여야 합니다.",
        });
      } else {
        finalItems.push(item);
      }
    }

    if (finalItems.length === 0) {
      return NextResponse.json({
        results: [...earlyErrors, ...notOwnedErrors, ...timeErrors],
      });
    }

    // ── Step 3: batch update inside one transaction ────────────────────────────
    await prisma.$transaction(
      finalItems.map((item) =>
        prisma.lessonSession.update({ where: { id: item.id }, data: item.data }),
      ),
    );

    // ── Step 4: batch read updated sessions ────────────────────────────────────
    const finalIds = finalItems.map((item) => item.id);
    const updatedSessions = await prisma.lessonSession.findMany({
      where: { id: { in: finalIds } },
      include: { homework: true },
    });
    const updatedMap = new Map(updatedSessions.map((s) => [s.id, s]));

    const successResults: BatchResult<ReturnType<typeof serializeSession>>[] =
      finalItems.map((item) => {
        const s = updatedMap.get(item.id);
        if (!s) return { sessionId: item.id, success: false, error: "수업을 찾을 수 없습니다." };
        return { sessionId: s.id, success: true, session: serializeSession(s) };
      });

    return NextResponse.json({
      results: [...earlyErrors, ...notOwnedErrors, ...timeErrors, ...successResults],
    });
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
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];

    if (rawIds.length === 0) return NextResponse.json({ results: [] });
    if (rawIds.length > 100) {
      return NextResponse.json(
        { error: "한 번에 최대 100개까지 처리할 수 있습니다." },
        { status: 400 },
      );
    }

    // ── Step 1: parse and validate IDs ────────────────────────────────────────
    const validIds: number[] = [];
    const parseErrors: BatchResult[] = [];
    for (const rawId of rawIds) {
      const idParam = parsePositiveInt(String(rawId), "id");
      if (!idParam.ok) {
        parseErrors.push({ success: false, error: idParam.error });
      } else {
        validIds.push(idParam.value);
      }
    }

    if (validIds.length === 0) {
      return NextResponse.json({ results: parseErrors });
    }

    // ── Step 2: batch ownership check ─────────────────────────────────────────
    const owned = await prisma.lessonSession.findMany({
      where: {
        id: { in: validIds },
        student: { instructorId: instructor.userId },
      },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((s) => s.id));

    const notOwnedErrors: BatchResult[] = validIds
      .filter((id) => !ownedIds.has(id))
      .map((id) => ({ sessionId: id, success: false, error: "수업을 찾을 수 없습니다." }));

    const toDelete = Array.from(ownedIds);

    // ── Step 3: batch delete ──────────────────────────────────────────────────
    if (toDelete.length > 0) {
      await prisma.lessonSession.deleteMany({ where: { id: { in: toDelete } } });
    }

    const successResults: BatchResult[] = toDelete.map((id) => ({
      sessionId: id,
      success: true,
    }));

    return NextResponse.json({
      results: [...parseErrors, ...notOwnedErrors, ...successResults],
    });
  } catch (error) {
    console.error("[DELETE /api/sessions/batch]", error);
    return NextResponse.json(
      { error: "수업 일괄 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
