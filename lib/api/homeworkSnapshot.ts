import type { Prisma } from "@prisma/client";

export type HomeworkOperation =
  | { type: "create"; clientId: number; text: string; done: boolean }
  | { type: "update"; id: number; text?: string; done?: boolean }
  | { type: "delete"; id: number };

type HomeworkOperationResult =
  | { ok: true; value: HomeworkOperation[] | undefined }
  | { ok: false; error: string };

/**
 * A missing value means "leave homework unchanged". An array is the complete
 * post-save homework list for the session.
 */
export function parseHomeworkOperations(value: unknown): HomeworkOperationResult {
  if (value === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(value)) {
    return { ok: false, error: "homework은 배열이어야 합니다." };
  }
  if (value.length > 100) {
    return { ok: false, error: "숙제는 한 번에 최대 100개까지 저장할 수 있습니다." };
  }

  const operations: HomeworkOperation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "숙제 형식이 올바르지 않습니다." };
    }
    const candidate = item as { type?: unknown; id?: unknown; clientId?: unknown; text?: unknown; done?: unknown };
    if (candidate.type === "create") {
      const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
      if (!text || typeof candidate.done !== "boolean" || typeof candidate.clientId !== "number") return { ok: false, error: "숙제 생성 형식이 올바르지 않습니다." };
      operations.push({ type: "create", clientId: candidate.clientId, text, done: candidate.done });
    } else if (candidate.type === "update") {
      if (typeof candidate.id !== "number" || !Number.isSafeInteger(candidate.id) || (candidate.text === undefined && candidate.done === undefined)) return { ok: false, error: "숙제 수정 형식이 올바르지 않습니다." };
      const text = candidate.text === undefined ? undefined : typeof candidate.text === "string" ? candidate.text.trim() : "";
      if (text === "" || (candidate.done !== undefined && typeof candidate.done !== "boolean")) return { ok: false, error: "숙제 수정 형식이 올바르지 않습니다." };
      operations.push({ type: "update", id: candidate.id, ...(text !== undefined && { text }), ...(candidate.done !== undefined && { done: candidate.done }) });
    } else if (candidate.type === "delete") {
      if (typeof candidate.id !== "number" || !Number.isSafeInteger(candidate.id)) return { ok: false, error: "숙제 삭제 형식이 올바르지 않습니다." };
      operations.push({ type: "delete", id: candidate.id });
    } else return { ok: false, error: "숙제 작업 형식이 올바르지 않습니다." };
  }
  return { ok: true, value: operations };
}

/** Replace one session's complete homework list inside the caller's transaction. */
export async function applyHomeworkOperations(
  tx: Prisma.TransactionClient,
  sessionId: number,
  operations: HomeworkOperation[],
) {
  for (const operation of operations) {
    if (operation.type === "create") {
      await tx.homeworkItem.create({ data: { sessionId, text: operation.text, done: operation.done } });
    } else if (operation.type === "update") {
      const result = await tx.homeworkItem.updateMany({ where: { id: operation.id, sessionId }, data: { ...(operation.text !== undefined && { text: operation.text }), ...(operation.done !== undefined && { done: operation.done }) } });
      if (result.count !== 1) throw new Error("숙제를 찾을 수 없습니다.");
    } else {
      const result = await tx.homeworkItem.deleteMany({ where: { id: operation.id, sessionId } });
      if (result.count !== 1) throw new Error("숙제를 찾을 수 없습니다.");
    }
  }
}
