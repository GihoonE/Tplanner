import { NextResponse, NextRequest } from "next/server";
import { requireInstructor } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import {
  isValidStudentColor,
  normalizeStoredStudentColor,
} from "@/lib/studentColor";

function normalizeStudentStatus(status: unknown) {
  return status === "active" ? "active" : "inactive";
}

function isValidStudentStatus(status: unknown) {
  return status === "active" || status === "inactive";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const { id } = params;
    const student = await prisma.student.findFirst({
      where: { id: parseInt(id, 10), instructorId: instructor.userId },
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
    return NextResponse.json({
      ...rest,
      status: normalizeStudentStatus(rest.status),
      sessions,
    });
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
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const numId = parseInt(params.id, 10);
    const body = await _req.json();
    const student = await prisma.student.findFirst({
      where: { id: numId, instructorId: instructor.userId },
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

    if (color != null) {
      if (!isValidStudentColor(color)) {
        return NextResponse.json(
          { error: "유효하지 않은 색상입니다. (프리셋 또는 #RRGGBB)" },
          { status: 400 },
        );
      }
    }
    if (status != null && !isValidStudentStatus(status)) {
      return NextResponse.json(
        { error: "상태는 active 또는 inactive여야 합니다." },
        { status: 400 },
      );
    }

    const updated = await prisma.student.update({
      where: { id: numId },
      data: {
        ...(name != null && { name }),
        ...(subject != null && { subject }),
        ...(grade != null && { grade }),
        ...(school != null && { school }),
        ...(color != null && {
          color: normalizeStoredStudentColor(color),
        }),
        ...(avatarChar != null && { avatarChar }),
        ...(status != null && { status }),
        ...(startDate != null && { startDate }),
        ...(totalSessions != null && { totalSessions: Number(totalSessions) }),
        ...(hwCompletionRate != null && {
          hwCompletionRate: Number(hwCompletionRate),
        }),
      },
    });
    return NextResponse.json({
      ...updated,
      status: normalizeStudentStatus(updated.status),
    });
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
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const existing = await prisma.student.findUnique({
      where: { id: parseInt(params.id, 10) },
      include: {
        sessions: {
          include: { homework: true },
          orderBy: { start: "desc" },
        },
      },
    });
    if (!existing || existing.instructorId !== instructor.userId) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const { sessions, ...rest } = existing;
    await prisma.student.delete({ where: { id: parseInt(params.id, 10) } });

    return NextResponse.json({
      ...rest,
      status: normalizeStudentStatus(rest.status),
      sessions,
    });
  } catch (e) {
    console.error("[DELETE] /api/students/[id]", e);
    return NextResponse.json(
      { error: "학생을 삭제하는 데 실패했습니다" },
      { status: 500 },
    );
  }
}
