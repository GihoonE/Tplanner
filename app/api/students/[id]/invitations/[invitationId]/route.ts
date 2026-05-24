import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

function parseId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; invitationId: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const studentId = parseId(params.id);
    const invitationId = parseId(params.invitationId);
    if (!studentId || !invitationId) {
      return NextResponse.json(
        { error: "유효한 초대 id가 아닙니다." },
        { status: 400 },
      );
    }

    const invitation = await prisma.studentInvitation.findFirst({
      where: {
        id: invitationId,
        studentId,
        instructorId: instructor.userId,
        student: { instructorId: instructor.userId },
      },
      select: { id: true },
    });
    if (!invitation) {
      return NextResponse.json(
        { error: "초대를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const revoked = await prisma.studentInvitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({
      id: revoked.id,
      studentId: revoked.studentId,
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[DELETE /api/students/[id]/invitations/[invitationId]]", e);
    return NextResponse.json(
      { error: "초대 취소에 실패했습니다." },
      { status: 500 },
    );
  }
}
