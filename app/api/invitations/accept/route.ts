import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/permissions";
import {
  hashInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/lib/invitations";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const parent = await requireParent();
    if (parent.response) return parent.response;

    const body = await request.json();
    const code = normalizeInviteCode(body.code);
    if (!isValidInviteCode(code)) {
      return NextResponse.json(
        { error: "초대 코드는 8자리 영문 대문자와 숫자여야 합니다." },
        { status: 400 },
      );
    }

    const invitation = await prisma.studentInvitation.findUnique({
      where: { codeHash: hashInviteCode(code) },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            subject: true,
            grade: true,
            school: true,
            color: true,
            avatarChar: true,
            status: true,
            startDate: true,
            totalSessions: true,
            hwCompletionRate: true,
          },
        },
      },
    });
    if (!invitation) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다." },
        { status: 404 },
      );
    }
    if (invitation.revokedAt) {
      return NextResponse.json(
        { error: "취소된 초대 코드입니다." },
        { status: 410 },
      );
    }
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "이미 사용된 초대 코드입니다." },
        { status: 409 },
      );
    }
    if (invitation.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "만료된 초대 코드입니다." },
        { status: 410 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const link = await tx.studentParent.upsert({
        where: {
          studentId_parentId: {
            studentId: invitation.studentId,
            parentId: parent.userId,
          },
        },
        update: {},
        create: {
          studentId: invitation.studentId,
          parentId: parent.userId,
        },
      });

      const accepted = await tx.studentInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { link, accepted };
    });

    return NextResponse.json({
      student: invitation.student,
      parentLink: {
        studentId: result.link.studentId,
        parentId: result.link.parentId,
        linkedAt: result.link.linkedAt.toISOString(),
      },
      invitation: {
        id: result.accepted.id,
        acceptedAt: result.accepted.acceptedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error("[POST /api/invitations/accept]", e);
    return NextResponse.json(
      { error: "초대 코드 수락에 실패했습니다." },
      { status: 500 },
    );
  }
}
