import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth/permissions";
import {
  generateInviteCode,
  hashInviteCode,
  invitationExpiresAt,
} from "@/lib/invitations";
import { prisma } from "@/lib/db";

function parseId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function serializeInvitation(invitation: {
  id: number;
  studentId: number;
  instructorId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: invitation.id,
    studentId: invitation.studentId,
    instructorId: invitation.instructorId,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const studentId = parseId(params.id);
    if (!studentId) {
      return NextResponse.json(
        { error: "유효한 학생 id가 아닙니다." },
        { status: 400 },
      );
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, instructorId: instructor.userId },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const invitations = await prisma.studentInvitation.findMany({
      where: {
        studentId,
        instructorId: instructor.userId,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations.map(serializeInvitation));
  } catch (e) {
    console.error("[GET /api/students/[id]/invitations]", e);
    return NextResponse.json(
      { error: "초대 목록을 불러오는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const studentId = parseId(params.id);
    if (!studentId) {
      return NextResponse.json(
        { error: "유효한 학생 id가 아닙니다." },
        { status: 400 },
      );
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, instructorId: instructor.userId },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    let code = generateInviteCode();
    let codeHash = hashInviteCode(code);
    for (let tries = 0; tries < 5; tries += 1) {
      const existing = await prisma.studentInvitation.findUnique({
        where: { codeHash },
        select: { id: true },
      });
      if (!existing) break;
      code = generateInviteCode();
      codeHash = hashInviteCode(code);
    }

    const now = new Date();
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.studentInvitation.updateMany({
        where: {
          studentId,
          instructorId: instructor.userId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      return tx.studentInvitation.create({
        data: {
          studentId,
          instructorId: instructor.userId,
          codeHash,
          expiresAt: invitationExpiresAt(),
        },
      });
    });

    return NextResponse.json(
      {
        ...serializeInvitation(invitation),
        code,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/students/[id]/invitations]", e);
    return NextResponse.json(
      { error: "초대 코드 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
