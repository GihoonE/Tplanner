// Canonical serializers for API responses.
// Import from here instead of defining inline per-route.

// ── Session ───────────────────────────────────────────────────────────────────

type SessionRow = {
  id: number;
  studentId: number | null;
  start: Date;
  end: Date;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  version: number;
  homework: { id: number; text: string; done: boolean }[];
};

export function serializeSession(s: SessionRow) {
  return {
    id: s.id,
    studentId: s.studentId,
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    place: s.place,
    notes: s.notes,
    understanding: s.understanding,
    focus: s.focus,
    version: s.version,
    homework: s.homework.map((h) => ({ id: h.id, text: h.text, done: h.done })),
  };
}

// ── Homework ──────────────────────────────────────────────────────────────────

export type HomeworkWithSession = {
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

export const homeworkInclude = {
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

export function serializeHomework(h: HomeworkWithSession) {
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

// ── Report ────────────────────────────────────────────────────────────────────

export const reportInclude = {
  student: {
    select: {
      id: true,
      name: true,
      subject: true,
      grade: true,
      color: true,
      avatarChar: true,
    },
  },
  sessions: {
    include: {
      session: {
        select: {
          id: true,
          start: true,
          end: true,
          notes: true,
          place: true,
          understanding: true,
          focus: true,
        },
      },
    },
    orderBy: { session: { start: "asc" } },
  },
} as const;

export type ReportWithRelations = {
  id: number;
  studentId: number;
  title: string;
  status: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  summary: string;
  strengths: string;
  improvements: string;
  nextPlan: string;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: number;
    name: string;
    subject: string;
    grade: string;
    color: string;
    avatarChar: string;
  };
  sessions: {
    sessionId: number;
    session: {
      id: number;
      start: Date;
      end: Date;
      notes: string;
      place: string;
      understanding: string;
      focus: string;
    };
  }[];
};

export function serializeReport(report: ReportWithRelations) {
  return {
    id: report.id,
    studentId: report.studentId,
    title: report.title,
    status: report.status,
    periodStart: report.periodStart?.toISOString() ?? null,
    periodEnd: report.periodEnd?.toISOString() ?? null,
    summary: report.summary,
    strengths: report.strengths,
    improvements: report.improvements,
    nextPlan: report.nextPlan,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    student: report.student,
    sessionIds: report.sessions.map((item) => item.sessionId),
    sessions: report.sessions.map((item) => ({
      id: item.session.id,
      start: item.session.start.toISOString(),
      end: item.session.end.toISOString(),
      notes: item.session.notes,
      place: item.session.place,
      understanding: item.session.understanding,
      focus: item.session.focus,
    })),
  };
}
