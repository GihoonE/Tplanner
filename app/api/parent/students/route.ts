import { NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

function isSameMonth(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function serializeSession(session: {
  id: number;
  start: Date;
  end: Date;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  homework: { id: number; text: string; done: boolean }[];
}) {
  return {
    id: session.id,
    start: session.start.toISOString(),
    end: session.end.toISOString(),
    place: session.place,
    notes: session.notes,
    understanding: session.understanding,
    focus: session.focus,
    homework: session.homework,
  };
}

export async function GET() {
  try {
    const parent = await requireParent();
    if (parent.response) return parent.response;

    const now = new Date();
    const students = await prisma.student.findMany({
      where: {
        parentLinks: {
          some: { parentId: parent.userId },
        },
      },
      include: {
        sessions: {
          include: { homework: true },
          orderBy: { start: "desc" },
        },
        reports: {
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(
      students.map((student) => {
        const sessionsAsc = [...student.sessions].sort(
          (a, b) => a.start.getTime() - b.start.getTime(),
        );
        const nextSession =
          sessionsAsc.find((session) => session.end >= now) ?? null;
        const pastSessions = student.sessions.filter(
          (session) => session.end < now,
        );
        const pendingHomeworkSessions = student.sessions
          .map((session) => ({
            session,
            homework: session.homework.filter((item) => !item.done),
          }))
          .filter((item) => item.homework.length > 0)
          .slice(0, 5);
        const homeworkTotal = student.sessions.reduce(
          (total, session) => total + session.homework.length,
          0,
        );
        const homeworkDone = student.sessions.reduce(
          (total, session) =>
            total + session.homework.filter((item) => item.done).length,
          0,
        );

        return {
          id: student.id,
          name: student.name,
          subject: student.subject,
          grade: student.grade,
          school: student.school,
          color: student.color,
          avatarChar: student.avatarChar,
          status: student.status,
          stats: {
            thisMonthSessionCount: student.sessions.filter((session) =>
              isSameMonth(session.start, now),
            ).length,
            pendingHomeworkCount: homeworkTotal - homeworkDone,
            homeworkCompletionRate:
              homeworkTotal === 0
                ? 100
                : Math.round((homeworkDone / homeworkTotal) * 100),
            reportCount: student.reports.length,
            nextSessionAt: nextSession?.start.toISOString() ?? null,
          },
          nextSession: nextSession ? serializeSession(nextSession) : null,
          recentSessions: pastSessions.slice(0, 6).map(serializeSession),
          pendingHomeworkSessions: pendingHomeworkSessions.map((item) => ({
            session: serializeSession(item.session),
            homework: item.homework,
          })),
          reports: student.reports.map((report) => ({
            id: report.id,
            title: report.title,
            status: report.status,
            periodStart: report.periodStart?.toISOString() ?? null,
            periodEnd: report.periodEnd?.toISOString() ?? null,
            summary: report.summary,
            updatedAt: report.updatedAt.toISOString(),
          })),
        };
      }),
    );
  } catch (e) {
    console.error("[GET /api/parent/students]", e);
    return NextResponse.json(
      { error: "학부모 학생 정보를 불러오는 데 실패했습니다." },
      { status: 500 },
    );
  }
}
