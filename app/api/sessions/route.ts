import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/sessions
 * 모든 학생 수업 목록 조회
 * 수업 목록 조회 (homework 포함)
 *
 * GET /api/sessions?studentId= N
 * 특정 학생 수업만
 */
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId");

    const sessions = await prisma.session.findMany({
      // 조건: studentId -> 있으면 문자열로 들어오는 studentId 쿼리 숫자로 바꿔 사용
      // 들어오는게 없으면 undefined -> 즉 전체 조회
      where: studentId ? { studentId: parseInt(studentId, 10) } : undefined,
      include: { homework: true },
      orderBy: { start: "desc" },
    });

    return NextResponse.json(
      sessions.map((s) => ({
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
      })),
    );
  } catch (error) {
    console.error("[GET /api/sessions]", error);
    return NextResponse.json(
      { error: "수업 목록을 불러오는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sessions
 * 새 수업 생성 (클라이언트가 studentId, start, end 등을 body로 보냄)
 */
export async function POST(_req: NextRequest) {
  try {
    const body = await _req.json();
    const {
      studentId,
      start,
      end,
      place,
      notes,
      understanding,
      focus,
      homework,
    } = body;

    if (!studentId || !start || !end) {
      return NextResponse.json(
        { error: "studentId, start, end는 필수입니다." },
        { status: 400 },
      );
    }

    const session = await prisma.session.create({
      data: {
        studentId: parseInt(studentId, 10),
        start: new Date(start),
        end: new Date(end),
        // 변수 ?? 대체제 -> 변수가 null/undefined면 오른쪽에 지정한 값 사용
        place: place ?? "",
        notes: notes ?? "",
        understanding: understanding ?? "",
        focus: focus ?? "",
      },
    });

    if (Array.isArray(homework) && homework.length > 0) {
      // homework 배열을 한번에 여러개 짚어 넣기
      await prisma.homeworkItem.createMany({
        // homework의 요소 중 text, done의 타입 지정
        data: homework.map((h: { text: string; done?: boolean }) => ({
          sessionId: session.id,
          text: h.text,
          done: h.done ?? false,
        })),
      });
    }

    const s = await prisma.session.findFirst({
      where: { id: session.id },
      include: { homework: true },
    });

    if (!s) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    console.error("[POST /api/sessions]", e);
    return NextResponse.json(
      { error: "수업 기록 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
