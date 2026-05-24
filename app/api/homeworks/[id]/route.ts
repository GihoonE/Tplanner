import { NextRequest, NextResponse } from "next/server";
import {
  requireInstructor,
  requireViewer,
  sessionStudentAccessWhere,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

type HomeworkWithSession = {
  id: number;
  sessionId: number;
  text: string;
  done: boolean;
  session: {
    id: number;
    start: Date;
    end: Date;
    studentId: number | null;
    student: {
      id: number;
      name: string;
      subject: string;
      color: string;
      avatarChar: string;
    } | null;
  };
};

const homeworkInclude = {
  session: {
    select: {
      id: true,
      start: true,
      end: true,
      studentId: true,
      student: {
        select: {
          id: true,
          name: true,
          subject: true,
          color: true,
          avatarChar: true,
        },
      },
    },
  },
} as const;

function serializeHomework(h: HomeworkWithSession) {
  return {
    id: h.id,
    sessionId: h.sessionId,
    text: h.text,
    done: h.done,
    session: {
      id: h.session.id,
      start: h.session.start.toISOString(),
      end: h.session.end.toISOString(),
      studentId: h.session.studentId,
      student: h.session.student,
    },
  };
}

function parseId(rawId: string) {
  if (!/^\d+$/.test(rawId)) return null;
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const id = parseId(params.id);
    if (id == null) {
      return NextResponse.json(
        { error: "유효한 숙제 id가 아닙니다." },
        { status: 400 },
      );
    }

    const homework = await prisma.homeworkItem.findFirst({
      where: {
        id,
        session: { student: sessionStudentAccessWhere(viewer) },
      },
      include: homeworkInclude,
    });
    if (!homework) {
      return NextResponse.json(
        { error: "숙제를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeHomework(homework));
  } catch (e) {
    console.error("[GET /api/homeworks/[id]]", e);
    return NextResponse.json(
      { error: "숙제를 조회하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const id = parseId(params.id);
    if (id == null) {
      return NextResponse.json(
        { error: "유효한 숙제 id가 아닙니다." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const data: { text?: string; done?: boolean } = {};

    if (body.text != null) {
      if (typeof body.text !== "string" || !body.text.trim()) {
        return NextResponse.json(
          { error: "숙제 내용을 입력하세요." },
          { status: 400 },
        );
      }
      data.text = body.text.trim();
    }
    if (body.done != null) {
      if (typeof body.done !== "boolean") {
        return NextResponse.json(
          { error: "done은 boolean이어야 합니다." },
          { status: 400 },
        );
      }
      data.done = body.done;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "수정할 숙제 필드가 없습니다." },
        { status: 400 },
      );
    }

    const existing = await prisma.homeworkItem.findFirst({
      where: {
        id,
        session: { student: { instructorId: instructor.userId } },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "숙제를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const homework = await prisma.homeworkItem.update({
      where: { id },
      data,
      include: homeworkInclude,
    });

    return NextResponse.json(serializeHomework(homework));
  } catch (e) {
    console.error("[PATCH /api/homeworks/[id]]", e);
    return NextResponse.json(
      { error: "숙제 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const id = parseId(params.id);
    if (id == null) {
      return NextResponse.json(
        { error: "유효한 숙제 id가 아닙니다." },
        { status: 400 },
      );
    }

    const existing = await prisma.homeworkItem.findFirst({
      where: {
        id,
        session: { student: { instructorId: instructor.userId } },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "숙제를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const homework = await prisma.homeworkItem.delete({
      where: { id },
      include: homeworkInclude,
    });

    return NextResponse.json(serializeHomework(homework));
  } catch (e) {
    console.error("[DELETE /api/homeworks/[id]]", e);
    return NextResponse.json(
      { error: "숙제 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
