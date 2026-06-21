import type { HomeworkOperation } from "@/lib/api/homeworkSnapshot";

/** Coalesce local homework edits so one final change produces one DB operation. */
export function mergeHomeworkOperation(
  operations: HomeworkOperation[],
  next: HomeworkOperation,
): HomeworkOperation[] {
  if (next.type === "create") return [...operations, next];
  const id = next.id;
  const createIndex = operations.findIndex(
    (operation) => operation.type === "create" && operation.clientId === id,
  );
  if (createIndex >= 0) {
    if (next.type === "delete") return operations.filter((_, index) => index !== createIndex);
    return operations.map((operation, index) =>
      index === createIndex && operation.type === "create"
        ? { ...operation, ...(next.text !== undefined && { text: next.text }), ...(next.done !== undefined && { done: next.done }) }
        : operation,
    );
  }
  if (next.type === "delete") {
    return [...operations.filter((operation) => !(operation.type === "update" && operation.id === id)), next];
  }
  const updateIndex = operations.findIndex(
    (operation) => operation.type === "update" && operation.id === id,
  );
  if (updateIndex < 0) return [...operations, next];
  return operations.map((operation, index) =>
    index === updateIndex && operation.type === "update"
      ? { ...operation, ...(next.text !== undefined && { text: next.text }), ...(next.done !== undefined && { done: next.done }) }
      : operation,
  );
}
