import { NextRequest } from "next/server";
import {
  requireInstructor,
  requireViewer,
  sessionStudentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import {
  serializeHomework,
  homeworkInclude,
} from "@/lib/api/serializers";
import { ok, err } from "@/lib/api/response";

function parseOptionalPositiveInt(value: string | null, field: string) {
  if (value == null || value === "") return null;
  if (!/^\d+$/.test(value)) return { error: `${field}는 양의 정수여야 합니다.` };
  const num = Number(value);
  if (!Number.isSafeInteger(num) || num < 1) return { error: `${field}는 양의 정수여야 합니다.` };
  return { value: num };
}

/**
 * GET /api/homeworks
 * 숙제 목록 조회. done, studentId, sessionId query로 필터링 가능.
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const { searchParams } = request.nextUrl;
    const doneParam = searchParams.get("done");
    const sessionIdParam = parseOptionalPositiveInt(searchParams.get("sessionId"), "sessionId");
    const studentIdParam = parseOptionalPositiveInt(searchParams.get("studentId"), "studentId");

    if (sessionIdParam?.error) return err(sessionIdParam.error, 400);
    if (studentIdParam?.error) return err(studentIdParam.error, 400);
    if (doneParam != null && doneParam !== "true" && doneParam !== "false") {
      return err("done은 true 또는 false여야 합니다.", 400);
    }

    const homeworks = await prisma.homeworkItem.findMany({
      where: {
        ...(doneParam != null && { done: doneParam === "true" }),
        ...(sessionIdParam?.value != null && { sessionId: sessionIdParam.value }),
        session: {
          student: sessionStudentAccessWhere(viewer),
          ...(studentIdParam?.value != null && { studentId: studentIdParam.value }),
        },
      },
      include: homeworkInclude,
      orderBy: [{ session: { start: "desc" } }, { id: "asc" }],
    });

    return ok(homeworks.map(serializeHomework));
  } catch (e) {
    console.error("[GET /api/homeworks]", e);
    return err("숙제 목록을 불러오는 데 실패했습니다.", 500);
  }
}

/**
 * POST /api/homeworks
 * 특정 수업에 새 숙제 추가.
 */
export async function POST(request: NextRequest) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const body = await request.json();
    const sessionIdParam = parseOptionalPositiveInt(String(body.sessionId ?? ""), "sessionId");
    if (sessionIdParam?.error || sessionIdParam?.value == null) {
      return err(sessionIdParam?.error ?? "sessionId는 필수입니다.", 400);
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return err("숙제 내용을 입력하세요.", 400);
    if (body.done != null && typeof body.done !== "boolean") {
      return err("done은 boolean이어야 합니다.", 400);
    }

    const session = await prisma.lessonSession.findFirst({
      where: {
        id: sessionIdParam.value,
        student: { instructorId: instructor.userId },
      },
      select: { id: true },
    });
    if (!session) return err("수업을 찾을 수 없습니다.", 404);

    const homework = await prisma.homeworkItem.create({
      data: {
        sessionId: sessionIdParam.value,
        text,
        done: body.done ?? false,
      },
      include: homeworkInclude,
    });

    return ok(serializeHomework(homework), 201);
  } catch (e) {
    console.error("[POST /api/homeworks]", e);
    return err("숙제 생성에 실패했습니다.", 500);
  }
}
