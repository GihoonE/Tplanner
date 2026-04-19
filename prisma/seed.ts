import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** DB 시드 전용 — 앱 런타임 `lib/constants`와 분리 */
const BASE = new Date(2025, 2, 20);

function ds(base: Date, offsetDays: number, h: number, m = 0): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(h, m, 0, 0);
  return d;
}

const SEED_STUDENTS = [
  {
    id: 1,
    name: "박민준",
    subject: "수학",
    grade: "고2",
    school: "한국고등학교",
    color: "s-blue",
    avatarChar: "박",
    status: "active",
    startDate: "2024-09",
    totalSessions: 42,
    hwCompletionRate: 78,
  },
  {
    id: 2,
    name: "이서연",
    subject: "영어",
    grade: "고1",
    school: "서울중학교",
    color: "s-teal",
    avatarChar: "이",
    status: "active",
    startDate: "2025-01",
    totalSessions: 18,
    hwCompletionRate: 92,
  },
  {
    id: 3,
    name: "최예린",
    subject: "물리",
    grade: "중3",
    school: "강남중학교",
    color: "s-purple",
    avatarChar: "최",
    status: "warning",
    startDate: "2024-11",
    totalSessions: 24,
    hwCompletionRate: 55,
  },
  {
    id: 4,
    name: "정하윤",
    subject: "수학",
    grade: "고3",
    school: "대치고등학교",
    color: "s-amber",
    avatarChar: "정",
    status: "active",
    startDate: "2024-08",
    totalSessions: 56,
    hwCompletionRate: 88,
  },
  {
    id: 5,
    name: "김도현",
    subject: "영어",
    grade: "중2",
    school: "목동중학교",
    color: "s-green",
    avatarChar: "김",
    status: "inactive",
    startDate: "2024-12",
    totalSessions: 12,
    hwCompletionRate: 60,
  },
] as const;

type SeedHomework = { text: string; done: boolean };

type SeedSession = {
  studentId: number | null;
  start: Date;
  end: Date;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  homework: SeedHomework[];
};

const SEED_SESSIONS: SeedSession[] = [
  {
    studentId: 1,
    start: ds(BASE, 0, 9),
    end: ds(BASE, 0, 11),
    place: "강남구 자택",
    notes:
      "극한 ε-δ 정의 그래프로 시각화. 연습문제 5개 중 4개 정답.",
    understanding: "good",
    focus: "high",
    homework: [
      { text: "수학 교재 p.56-60", done: false },
      { text: "연속함수 정리", done: true },
    ],
  },
  {
    studentId: 2,
    start: ds(BASE, 0, 14),
    end: ds(BASE, 0, 15, 30),
    place: "온라인 Zoom",
    notes: "독해 실전 문제 3세트 풀이. 어휘 실수 줄어들고 있음.",
    understanding: "good",
    focus: "high",
    homework: [{ text: "어휘 50개 암기", done: false }],
  },
  {
    studentId: 3,
    start: ds(BASE, 0, 17),
    end: ds(BASE, 0, 18),
    place: "강남구 자택",
    notes: "",
    understanding: "normal",
    focus: "normal",
    homework: [],
  },
  {
    studentId: 4,
    start: ds(BASE, -1, 10),
    end: ds(BASE, -1, 12),
    place: "목동 학원",
    notes: "수열 심화 — 등차수열 완벽 이해, 등비수열 연습 필요.",
    understanding: "good",
    focus: "high",
    homework: [{ text: "등비수열 문제 10개", done: false }],
  },
  {
    studentId: 1,
    start: ds(BASE, -1, 15),
    end: ds(BASE, -1, 17),
    place: "온라인",
    notes: "미적분 복습.",
    understanding: "normal",
    focus: "normal",
    homework: [],
  },
  {
    studentId: 5,
    start: ds(BASE, 1, 11),
    end: ds(BASE, 1, 13),
    place: "강남구 자택",
    notes: "",
    understanding: "",
    focus: "",
    homework: [],
  },
  {
    studentId: 2,
    start: ds(BASE, 2, 14),
    end: ds(BASE, 2, 15, 30),
    place: "온라인",
    notes: "",
    understanding: "",
    focus: "",
    homework: [],
  },
  {
    studentId: 3,
    start: ds(BASE, 2, 23, 0),
    end: ds(BASE, 3, 1, 30),
    place: "온라인 Zoom",
    notes: "자정 넘어가는 심화 수업.",
    understanding: "good",
    focus: "high",
    homework: [{ text: "물리 교재 p.88 정리", done: false }],
  },
];

async function main() {
  await prisma.homeworkItem.deleteMany();
  await prisma.session.deleteMany();
  await prisma.student.deleteMany();

  await prisma.student.createMany({
    data: SEED_STUDENTS.map((s) => ({
      id: s.id,
      name: s.name,
      subject: s.subject,
      grade: s.grade,
      school: s.school,
      color: s.color,
      avatarChar: s.avatarChar,
      status: s.status,
      startDate: s.startDate,
      totalSessions: s.totalSessions,
      hwCompletionRate: s.hwCompletionRate,
    })),
  });

  for (const s of SEED_SESSIONS) {
    const { homework, ...rest } = s;
    const session = await prisma.session.create({
      data: {
        studentId: rest.studentId,
        start: rest.start,
        end: rest.end,
        place: rest.place,
        notes: rest.notes,
        understanding: rest.understanding,
        focus: rest.focus,
      },
    });
    if (homework.length > 0) {
      await prisma.homeworkItem.createMany({
        data: homework.map((h) => ({
          sessionId: session.id,
          text: h.text,
          done: h.done,
        })),
      });
    }
  }

  const studentCount = await prisma.student.count();
  const sessionCount = await prisma.session.count();
  console.log("✅ Seed 완료:", studentCount, "명,", sessionCount, "개 수업");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
