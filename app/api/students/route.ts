import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/students
 * 학생 목록 조회 (각 학생별 최근 수업 날짜, 이번 달 수업 수 포함)
 */
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      orderBy: { id: "asc" },
      include: {
        // session 테이블을 조회해서 같이 가져오자
        sessions: {
          // session의 start column만 가져옴
          select: { start: true, notes: true },
          orderBy: { start: "desc" },
        },
      },
    });

    const now = new Date();
    // 올해, 이번달, 1일로 날짜 만들기
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return NextResponse.json(
      // students array에서 요소 하나씩 빼서 s로 callback함수에 넘김
      students.map((s) => {
        const lastSession = s.sessions[0];
        const thisMonthCount = s.sessions.filter(
          (ss) => new Date(ss.start) >= thisMonthStart,
        ).length;

        return {
          id: s.id,
          name: s.name,
          subject: s.subject,
          grade: s.grade,
          school: s.school,
          color: s.color as
            | "s-blue"
            | "s-teal"
            | "s-purple"
            | "s-amber"
            | "s-green"
            | "s-coral",
          avatarChar: s.avatarChar,
          status: s.status as "active" | "warning" | "inactive",
          startDate: s.startDate,
          totalSessions: s.totalSessions,
          hwCompletionRate: s.hwCompletionRate,
          // 최근수업시간 toISOSTring() -> YYYYY-MM-DDTHH:mm:ss로 변환 아니면 null
          lastSessionAt: lastSession?.start.toISOString() ?? null,
          lastSessionContent: lastSession?.notes ?? null,
          thisMonthSessionCount: thisMonthCount,
        };
      }),
    );
  } catch (error) {
    console.error("[GET /api/students]", error);
    return NextResponse.json(
      { error: "학생 목록을 불러오는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // 요청 바디에서 학생 정보 추출
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
    } = await request.json();
    // 학생 정보를 데이터베이스에 저장
    const student = await prisma.student.create({
      data: {
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
      },
    });
    return NextResponse.json(student);
  } catch (error) {
    console.error("[POST /api/students]", error);
    return NextResponse.json(
      { error: "학생을 추가하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}
