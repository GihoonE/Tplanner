import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { GET, PATCH, DELETE } from "@/app/api/sessions/[id]/route";
import { createGetRequest, createJsonRequest, parseResponse } from "../helpers";

const createContext = (id: number) => ({ params: { id: String(id) } });

describe("GET /api/sessions/[id]", () => {
  let sessionId: number;

  beforeEach(async () => {
    await prisma.homeworkItem.deleteMany();
    await prisma.lessonSession.deleteMany();
    await prisma.student.deleteMany();

    const student = await prisma.student.create({
      data: {
        name: "테스트",
        subject: "수학",
        grade: "고1",
        school: "테스트고",
        color: "s-blue",
        avatarChar: "테",
        status: "active",
        startDate: "2024-09",
        totalSessions: 0,
        hwCompletionRate: 0,
      },
    });

    const session = await prisma.lessonSession.create({
      data: {
        studentId: student.id,
        start: new Date("2025-03-20T09:00:00"),
        end: new Date("2025-03-20T11:00:00"),
        place: "자택",
        notes: "테스트 메모",
      },
    });
    sessionId = session.id;
  });

  it("존재하는 수업 조회", async () => {
    const req = createGetRequest(`http://localhost/api/sessions/${sessionId}`);
    const res = await GET(req, createContext(sessionId));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data.id).toBe(sessionId);
    expect(data.notes).toBe("테스트 메모");
    expect(data.homework).toEqual([]);
  });

  it("없는 id 404", async () => {
    const req = createGetRequest("http://localhost/api/sessions/99999");
    const res = await GET(req, createContext(99999));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(404);
    expect(data.error).toContain("찾을 수 없습니다");
  });
});

describe("PATCH /api/sessions/[id]", () => {
  let sessionId: number;

  beforeEach(async () => {
    await prisma.homeworkItem.deleteMany();
    await prisma.lessonSession.deleteMany();
    await prisma.student.deleteMany();

    const student = await prisma.student.create({
      data: {
        name: "테스트",
        subject: "수학",
        grade: "고1",
        school: "테스트고",
        color: "s-blue",
        avatarChar: "테",
        status: "active",
        startDate: "2024-09",
        totalSessions: 0,
        hwCompletionRate: 0,
      },
    });

    const session = await prisma.lessonSession.create({
      data: {
        studentId: student.id,
        start: new Date("2025-03-20T09:00:00"),
        end: new Date("2025-03-20T11:00:00"),
        place: "자택",
        notes: "기존 메모",
      },
    });
    sessionId = session.id;
  });

  it("수업 메모 수정", async () => {
    const req = createJsonRequest(
      `http://localhost/api/sessions/${sessionId}`,
      "PATCH",
      { notes: "수정된 메모" },
    );

    const res = await PATCH(req, createContext(sessionId));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data.notes).toBe("수정된 메모");
  });

  it("homework 교체", async () => {
    await prisma.homeworkItem.createMany({
      data: [
        { sessionId, text: "기존 숙제1", done: false },
        { sessionId, text: "기존 숙제2", done: true },
      ],
    });

    const req = createJsonRequest(
      `http://localhost/api/sessions/${sessionId}`,
      "PATCH",
      {
        homework: [
          { text: "새 숙제1", done: false },
          { text: "새 숙제2", done: true },
        ],
      },
    );

    const res = await PATCH(req, createContext(sessionId));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    const hw = data.homework as Array<{ text: string }>;
    expect(hw).toHaveLength(2);
    expect(hw.map((h) => h.text)).toEqual(["새 숙제1", "새 숙제2"]);
  });
});

describe("DELETE /api/sessions/[id]", () => {
  let sessionId: number;

  beforeEach(async () => {
    await prisma.homeworkItem.deleteMany();
    await prisma.lessonSession.deleteMany();
    await prisma.student.deleteMany();

    const student = await prisma.student.create({
      data: {
        name: "테스트",
        subject: "수학",
        grade: "고1",
        school: "테스트고",
        color: "s-blue",
        avatarChar: "테",
        status: "active",
        startDate: "2024-09",
        totalSessions: 0,
        hwCompletionRate: 0,
      },
    });

    const session = await prisma.lessonSession.create({
      data: {
        studentId: student.id,
        start: new Date("2025-03-20T09:00:00"),
        end: new Date("2025-03-20T11:00:00"),
      },
    });
    sessionId = session.id;
  });

  it("수업 삭제 성공", async () => {
    const req = createGetRequest(`http://localhost/api/sessions/${sessionId}`);
    const res = await DELETE(req, createContext(sessionId));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data.id).toBe(sessionId);

    const found = await prisma.lessonSession.findUnique({ where: { id: sessionId } });
    expect(found).toBeNull();
  });

  it("없는 id 삭제 시 500 (Prisma RecordNotFound)", async () => {
    const req = createGetRequest("http://localhost/api/sessions/99999");
    const res = await DELETE(req, createContext(99999));

    expect(res.status).toBe(500);
  });
});
