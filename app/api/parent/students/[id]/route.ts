import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

function parseId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parent = await requireParent();
    if (parent.response) return parent.response;

    const studentId = parseId(params.id);
    if (!studentId) {
      return NextResponse.json(
        { error: "유효한 학생 id가 아닙니다." },
        { status: 400 },
      );
    }

    const link = await prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId,
          parentId: parent.userId,
        },
      },
      select: { studentId: true, parentId: true },
    });

    if (!link) {
      return NextResponse.json(
        { error: "연결된 학생을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await prisma.studentParent.delete({
      where: {
        studentId_parentId: {
          studentId,
          parentId: parent.userId,
        },
      },
    });

    return NextResponse.json({ ok: true, studentId });
  } catch (e) {
    console.error("[DELETE /api/parent/students/[id]]", e);
    return NextResponse.json(
      { error: "학생 연결 해제에 실패했습니다." },
      { status: 500 },
    );
  }
}
