import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const student = await prisma.student.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        sessions: {
          include: { homework: true },
          orderBy: { start: "desc" },
        },
      },
    });
    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const { sessions, ...rest } = student;
    return NextResponse.json({ ...rest, sessions });
  } catch (e) {
    console.error("[GET] /api/students/[id]", e);
    return NextResponse.json(
      { error: "학생을 조회하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const numId = parseInt(params.id, 10);
    const body = await _req.json();
    const student = await prisma.student.findUnique({
      where: { id: numId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    const {
      name,
      subject,
      grade,
      school,
      color,
      avatarChar,
      status,
      startDate,
      totalSessions,
      hwCompletionRate,
    } = body;
    const updated = await prisma.student.update({
      where: { id: numId },
      data: {
        ...(name != null && { name }),
        ...(subject != null && { subject }),
        ...(grade != null && { grade }),
        ...(school != null && { school }),
        ...(color != null && { color }),
        ...(avatarChar != null && { avatarChar }),
        ...(status != null && { status }),
        ...(startDate != null && { startDate }),
        ...(totalSessions != null && { totalSessions: Number(totalSessions) }),
        ...(hwCompletionRate != null && {
          hwCompletionRate: Number(hwCompletionRate),
        }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH] /api/students/[id]", e);
    return NextResponse.json(
      { error: "학생 정보를 수정하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const existing = await prisma.student.findUnique({
      where: { id: parseInt(params.id, 10) },
      include: {
        sessions: {
          include: { homework: true },
          orderBy: { start: "desc" },
        },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const { sessions, ...rest } = existing;
    await prisma.student.delete({ where: { id: parseInt(params.id, 10) } });

    return NextResponse.json({ ...rest, sessions });
  } catch (e) {
    console.error("[DELETE] /api/students/[id]", e);
    return NextResponse.json(
      { error: "학생을 삭제하는 데 실패했습니다" },
      { status: 500 },
    );
  }
}
