import { PrismaClient } from "@prisma/client";
import { SEED_STUDENTS, SEED_SESSIONS } from "../lib/constants";

const prisma = new PrismaClient();

async function main() {
  // FK 의존 순서: HomeworkItem → Session → Student
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
