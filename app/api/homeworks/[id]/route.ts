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
import { parseRouteId } from "@/lib/api/validation";
import { ok, err } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err("유효한 숙제 id가 아닙니다.", 400);

    const homework = await prisma.homeworkItem.findFirst({
      where: {
        id: idParam.value,
        session: { student: sessionStudentAccessWhere(viewer) },
      },
      include: homeworkInclude,
    });
    if (!homework) return err("숙제를 찾을 수 없습니다.", 404);
    return ok(serializeHomework(homework));
  } catch (e) {
    console.error("[GET /api/homeworks/[id]]", e);
    return err("숙제를 조회하는 데 실패했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err("유효한 숙제 id가 아닙니다.", 400);

    const body = await request.json();
    const data: { text?: string; done?: boolean } = {};

    if (body.text != null) {
      if (typeof body.text !== "string" || !body.text.trim()) {
        return err("숙제 내용을 입력하세요.", 400);
      }
      data.text = body.text.trim();
    }
    if (body.done != null) {
      if (typeof body.done !== "boolean") return err("done은 boolean이어야 합니다.", 400);
      data.done = body.done;
    }
    if (Object.keys(data).length === 0) return err("수정할 숙제 필드가 없습니다.", 400);

    const existing = await prisma.homeworkItem.findFirst({
      where: {
        id: idParam.value,
        session: { student: { instructorId: instructor.userId } },
      },
      select: { id: true },
    });
    if (!existing) return err("숙제를 찾을 수 없습니다.", 404);

    const homework = await prisma.homeworkItem.update({
      where: { id: idParam.value },
      data,
      include: homeworkInclude,
    });

    return ok(serializeHomework(homework));
  } catch (e) {
    console.error("[PATCH /api/homeworks/[id]]", e);
    return err("숙제 수정에 실패했습니다.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parseRouteId(params.id);
    if (!idParam.ok) return err("유효한 숙제 id가 아닙니다.", 400);

    const existing = await prisma.homeworkItem.findFirst({
      where: {
        id: idParam.value,
        session: { student: { instructorId: instructor.userId } },
      },
      select: { id: true },
    });
    if (!existing) return err("숙제를 찾을 수 없습니다.", 404);

    const homework = await prisma.homeworkItem.delete({
      where: { id: idParam.value },
      include: homeworkInclude,
    });

    return ok(serializeHomework(homework));
  } catch (e) {
    console.error("[DELETE /api/homeworks/[id]]", e);
    return err("숙제 삭제에 실패했습니다.", 500);
  }
}
