import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// id로 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const s = await prisma.session.findUnique({
      where: { id: parseInt(id, 10) },
      include: { homework: true },
    });
    if (!s) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      id: s.id,
      studentId: s.studentId,
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      place: s.place,
      notes: s.notes,
      understanding: s.understanding,
      focus: s.focus,
      homework: s.homework.map((h) => ({
        id: h.id,
        text: h.text,
        done: h.done,
      })),
    });
  } catch (e) {
    console.error("[GET] /api/sessions/[id]", e);
    return NextResponse.json(
      { error: "수업 기록을 조회하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

// id로 수정
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const numId = parseInt(id, 10);
    if (!Number.isFinite(numId) || numId < 1) {
      return NextResponse.json(
        { error: "유효한 수업 id가 아닙니다." },
        { status: 400 },
      );
    }

    const existing = await prisma.session.findUnique({
      where: { id: numId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await _req.json();
    const { place, notes, understanding, focus, homework, start, end } = body;

    //transaction: 실패시 롤백 진행
    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: numId },
        data: {
          // ...(조건 && {key:value})
          // 조건 만족 시 값이 들어감
          ...(place != null && { place }),
          ...(notes != null && { notes }),
          ...(understanding != null && { understanding }),
          ...(focus != null && { focus }),
          ...(start != null && { start }),
          ...(end != null && { end }),
        },
      });

      // 우선 수업 기록 고치면 해당 수업의 모든 숙제 지웠다가 들어오는 요청에 맞춰 다시 생성
      if (Array.isArray(homework)) {
        await tx.homeworkItem.deleteMany({ where: { sessionId: numId } });
        if (homework.length > 0) {
          await tx.homeworkItem.createMany({
            data: homework.map((h: { text: string; done: boolean }) => ({
              sessionId: numId,
              text: h.text,
              done: h.done ?? false,
            })),
          });
        }
      }
    });

    const updated = await prisma.session.findFirst({
      where: { id: numId },
      include: { homework: true },
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: updated.id,
      studentId: updated.studentId,
      start: updated.start.toISOString(),
      end: updated.end.toISOString(),
      place: updated.place,
      notes: updated.notes,
      understanding: updated.understanding,
      focus: updated.focus,
      homework: updated.homework.map((h) => ({
        id: h.id,
        text: h.text,
        done: h.done,
      })),
    });
  } catch (e) {
    console.error("[PATCH] /api/sessions/[id]", e);
    return NextResponse.json(
      { error: "수업 기록 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// sessionId로 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const s = await prisma.session.delete({
      where: { id: parseInt(id, 10) },
    });
    return NextResponse.json({
      id: s.id,
      studentId: s.studentId,
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      place: s.place,
      notes: s.notes,
      understanding: s.understanding,
      focus: s.focus,
      homework: [],
    });
  } catch (e) {
    console.error("[DELETE /api/sessions/[id]]", e);
    return NextResponse.json(
      { error: "수업 기록을 삭제하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}
