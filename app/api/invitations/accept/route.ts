import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/permissions";
import {
  hashInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/lib/invitations";
import { isInviteRateLimited, recordWrongInviteAttempt } from "@/lib/rateLimit";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const parent = await requireParent();
    if (parent.response) return parent.response;

    if (isInviteRateLimited(parent.userId)) {
      return NextResponse.json(
        { error: "초대 코드 시도 횟수를 초과했습니다. 1시간 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const code = normalizeInviteCode(body.code);
    if (!isValidInviteCode(code)) {
      recordWrongInviteAttempt(parent.userId);
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
      recordWrongInviteAttempt(parent.userId);
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다." },
        { status: 404 },
      );
    }
    const now = new Date();
    if (invitation.revokedAt) {
      recordWrongInviteAttempt(parent.userId);
      return NextResponse.json(
        { error: "취소된 초대 코드입니다." },
        { status: 410 },
      );
    }
    if (invitation.acceptedAt) {
      recordWrongInviteAttempt(parent.userId);
      return NextResponse.json(
        { error: "이미 사용된 초대 코드입니다." },
        { status: 409 },
      );
    }
    if (invitation.expiresAt <= now) {
      recordWrongInviteAttempt(parent.userId);
      return NextResponse.json(
        { error: "만료된 초대 코드입니다." },
        { status: 410 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const accepted = await tx.studentInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });
      if (accepted.count !== 1) {
        return null;
      }

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

      return { link, acceptedAt: now };
    });
    if (!result) {
      return NextResponse.json(
        { error: "이미 사용되었거나 만료된 초대 코드입니다." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      student: invitation.student,
      parentLink: {
        studentId: result.link.studentId,
        parentId: result.link.parentId,
        linkedAt: result.link.linkedAt.toISOString(),
      },
      invitation: {
        id: invitation.id,
        acceptedAt: result.acceptedAt.toISOString(),
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
