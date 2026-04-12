/**
 * 학생 삭제(SetNull) 이후 남은 고아 수업 정리 (수동 1회 실행)
 *
 * 1) studentId가 있는데 해당 id 학생이 없는 Session → 삭제 (숙제는 Session CASCADE)
 * 2) --null 과 함께 --execute 시: studentId가 NULL인 Session 전부 삭제
 *    (캘린더 초안 등도 지워짐 — 필요할 때만 사용)
 *
 * 사용:
 *   npx tsx prisma/cleanup-orphan-sessions.ts           # 미리보기만
 *   npx tsx prisma/cleanup-orphan-sessions.ts --execute
 *   npx tsx prisma/cleanup-orphan-sessions.ts --execute --null
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const execute = process.argv.includes("--execute");
  const includeNull = process.argv.includes("--null");

  const validIds = new Set(
    (await prisma.student.findMany({ select: { id: true } })).map((s) => s.id),
  );

  const withStudentId = await prisma.session.findMany({
    where: { studentId: { not: null } },
    select: { id: true, studentId: true },
  });
  const missingStudent = withStudentId.filter(
    (s) => s.studentId != null && !validIds.has(s.studentId),
  );

  const nullSessions = includeNull
    ? await prisma.session.findMany({
        where: { studentId: null },
        select: { id: true },
      })
    : [];

  console.log("── 고아 수업 정리 ──");
  console.log(
    `학생 id가 DB에 없는 수업: ${missingStudent.length}건`,
    missingStudent.length ? missingStudent.slice(0, 10).map((s) => s.id) : "",
  );
  if (includeNull) {
    console.log(`studentId NULL 수업 (--null): ${nullSessions.length}건`);
  } else {
    console.log(
      "studentId NULL 수업은 건너뜀. 예전 SetNull 잔여까지 지우려면 --null 추가.",
    );
  }

  if (!execute) {
    console.log("\n적용하려면: npx tsx prisma/cleanup-orphan-sessions.ts --execute");
    if (!includeNull) {
      console.log("NULL 수업까지 지우려면: ... --execute --null");
    }
    return;
  }

  const idsMissing = missingStudent.map((s) => s.id);
  if (idsMissing.length > 0) {
    const r = await prisma.session.deleteMany({ where: { id: { in: idsMissing } } });
    console.log(`\n삭제됨 (존재하지 않는 학생 참조): ${r.count}건`);
  }

  if (includeNull && nullSessions.length > 0) {
    const r = await prisma.session.deleteMany({ where: { studentId: null } });
    console.log(`삭제됨 (studentId NULL): ${r.count}건`);
  }

  console.log("완료.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
