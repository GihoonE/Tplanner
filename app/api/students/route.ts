import { NextRequest, NextResponse } from "next/server";
import {
  requireInstructor,
  requireViewer,
  studentAccessWhere,
} from "@/lib/auth/permissions";
import {
  parseBoundedInteger,
  parseMonthString,
  parseRequiredString,
  parseStudentColor,
  parseStudentStatus,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";

function normalizeStudentStatus(status: unknown) {
  return status === "active" ? "active" : "inactive";
}

function statusWhereFromRequest(request: NextRequest) {
  const includeInactive = request.nextUrl.searchParams.get("includeInactive");
  const status = request.nextUrl.searchParams.get("status");

  if (includeInactive === "true" || status === "all") return {};
  if (status === "inactive") return { status: "inactive" };
  return { status: "active" };
}

/**
 * GET /api/students
 * 학생 목록 조회 (각 학생별 최근 수업 날짜, 이번 달 수업 수 포함)
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await requireViewer();
    if (viewer.response) return viewer.response;

    const now = new Date();
    // 올해, 이번달, 1일로 날짜 만들기
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const students = await prisma.student.findMany({
      where: {
        ...studentAccessWhere(viewer),
        ...statusWhereFromRequest(request),
      },
      orderBy: { id: "asc" },
      include: {
        // session 테이블을 조회해서 같이 가져오자
        sessions: {
          // session의 start column만 가져옴
          select: { start: true, notes: true },
          orderBy: { start: "desc" },
          take: 1,
        },
        _count: {
          select: {
            sessions: {
              where: {
                start: { gte: thisMonthStart },
              },
            },
          },
        },
        parentLinks: {
          select: {
            linkedAt: true,
            parent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { linkedAt: "asc" },
        },
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      students.map((s) => {
        const lastSession = s.sessions[0];
        return {
          id: s.id,
          name: s.name,
          subject: s.subject,
          grade: s.grade,
          school: s.school,
          color: s.color,
          avatarChar: s.avatarChar,
          status: normalizeStudentStatus(s.status),
          startDate: s.startDate,
          totalSessions: s.totalSessions,
          hwCompletionRate: s.hwCompletionRate,
          // 최근수업시간 toISOSTring() -> YYYYY-MM-DDTHH:mm:ss로 변환 아니면 null
          lastSessionAt: lastSession?.start.toISOString() ?? null,
          lastSessionContent: lastSession?.notes ?? null,
          thisMonthSessionCount: s._count.sessions,
          parents: s.parentLinks.map((link) => ({
            id: link.parent.id,
            name: link.parent.name,
            email: link.parent.email,
            linkedAt: link.linkedAt.toISOString(),
          })),
          instructor: s.instructor
            ? {
                id: s.instructor.id,
                name: s.instructor.name,
                email: s.instructor.email,
              }
            : null,
        };
      }),
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
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
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

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

    const nameParam = parseRequiredString(name, "name");
    if (!nameParam.ok) return badRequest(nameParam.error);
    const subjectParam = parseRequiredString(subject, "subject");
    if (!subjectParam.ok) return badRequest(subjectParam.error);
    const gradeParam = parseRequiredString(grade, "grade");
    if (!gradeParam.ok) return badRequest(gradeParam.error);
    const schoolParam = parseRequiredString(school, "school");
    if (!schoolParam.ok) return badRequest(schoolParam.error);
    const avatarParam = parseRequiredString(avatarChar, "avatarChar");
    if (!avatarParam.ok) return badRequest(avatarParam.error);
    const startDateParam = parseMonthString(startDate, "startDate");
    if (!startDateParam.ok) return badRequest(startDateParam.error);
    const colorParam = parseStudentColor(color ?? "s-blue");
    if (!colorParam.ok) return badRequest(colorParam.error);
    const statusParam = parseStudentStatus(status ?? "active");
    if (!statusParam.ok) return badRequest(statusParam.error);
    const totalSessionsParam =
      totalSessions == null
        ? { ok: true as const, value: 0 }
        : parseBoundedInteger(totalSessions, "totalSessions", 0, 10000);
    if (!totalSessionsParam.ok) return badRequest(totalSessionsParam.error);
    const hwCompletionRateParam =
      hwCompletionRate == null
        ? { ok: true as const, value: 0 }
        : parseBoundedInteger(hwCompletionRate, "hwCompletionRate", 0, 100);
    if (!hwCompletionRateParam.ok) {
      return badRequest(hwCompletionRateParam.error);
    }

    // 학생 정보를 데이터베이스에 저장
    const student = await prisma.student.create({
      data: {
        name: nameParam.value,
        subject: subjectParam.value,
        grade: gradeParam.value,
        school: schoolParam.value,
        color: colorParam.value,
        avatarChar: avatarParam.value,
        status: statusParam.value,
        startDate: startDateParam.value,
        totalSessions: totalSessionsParam.value,
        hwCompletionRate: hwCompletionRateParam.value,
        instructorId: instructor.userId,
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

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
