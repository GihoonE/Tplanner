import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/sessions/[id]/route";
import { createGetRequest, createJsonRequest, parseResponse } from "../helpers";

const mocks = vi.hoisted(() => ({
  requireViewer: vi.fn(),
  requireInstructor: vi.fn(),
  sessionStudentAccessWhere: vi.fn(),
  prisma: {
    lessonSession: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  txLessonSessionUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireViewer: mocks.requireViewer,
  requireInstructor: mocks.requireInstructor,
  sessionStudentAccessWhere: mocks.sessionStudentAccessWhere,
}));

vi.mock("@/lib/db", () => ({
  prisma: mocks.prisma,
}));

const createContext = (id: string | number) => ({ params: { id: String(id) } });
const baseSession = {
  id: 1,
  studentId: 10,
  start: new Date("2025-03-20T09:00:00.000Z"),
  end: new Date("2025-03-20T11:00:00.000Z"),
  place: "자택",
  notes: "테스트 메모",
  understanding: "",
  focus: "",
  homework: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireViewer.mockResolvedValue({ userId: "user_1", role: "instructor" });
  mocks.requireInstructor.mockResolvedValue({ userId: "user_1" });
  mocks.sessionStudentAccessWhere.mockReturnValue({ instructorId: "user_1" });
  mocks.prisma.$transaction.mockImplementation(async (callback) =>
    callback({
      lessonSession: {
        update: mocks.txLessonSessionUpdate,
      },
    }),
  );
});

describe("GET /api/sessions/[id]", () => {
  it("returns an existing session", async () => {
    mocks.prisma.lessonSession.findFirst.mockResolvedValue(baseSession);

    const req = createGetRequest("http://localhost/api/sessions/1");
    const res = await GET(req, createContext(1));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.notes).toBe("테스트 메모");
    expect(data.homework).toEqual([]);
  });

  it("returns 400 for an invalid id", async () => {
    const req = createGetRequest("http://localhost/api/sessions/not-a-number");
    const res = await GET(req, createContext("not-a-number"));

    expect(res.status).toBe(400);
    expect(mocks.prisma.lessonSession.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing session", async () => {
    mocks.prisma.lessonSession.findFirst.mockResolvedValue(null);

    const req = createGetRequest("http://localhost/api/sessions/99999");
    const res = await GET(req, createContext(99999));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(404);
    expect(data.error).toContain("찾을 수 없습니다");
  });
});

describe("PATCH /api/sessions/[id]", () => {
  it("updates session notes", async () => {
    mocks.prisma.lessonSession.findFirst
      .mockResolvedValueOnce({
        id: 1,
        start: baseSession.start,
        end: baseSession.end,
      })
      .mockResolvedValueOnce({ ...baseSession, notes: "수정된 메모" });

    const req = createJsonRequest("http://localhost/api/sessions/1", "PATCH", {
      notes: "수정된 메모",
    });

    const res = await PATCH(req, createContext(1));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data.notes).toBe("수정된 메모");
    expect(mocks.txLessonSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ notes: "수정된 메모" }),
      }),
    );
  });

  it("rejects reversed time intervals", async () => {
    mocks.prisma.lessonSession.findFirst.mockResolvedValueOnce({
      id: 1,
      start: baseSession.start,
      end: baseSession.end,
    });

    const req = createJsonRequest("http://localhost/api/sessions/1", "PATCH", {
      end: "2025-03-20T08:00:00.000Z",
    });

    const res = await PATCH(req, createContext(1));
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(400);
    expect(data.error).toContain("종료 시각");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unsupported enum values", async () => {
    mocks.prisma.lessonSession.findFirst.mockResolvedValueOnce({
      id: 1,
      start: baseSession.start,
      end: baseSession.end,
    });

    const req = createJsonRequest("http://localhost/api/sessions/1", "PATCH", {
      focus: "sometimes",
    });

    const res = await PATCH(req, createContext(1));
    expect(res.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/sessions/[id]", () => {
  it("deletes a session", async () => {
    mocks.prisma.lessonSession.findFirst.mockResolvedValue({ id: 1 });
    mocks.prisma.lessonSession.delete.mockResolvedValue(baseSession);

    const req = createGetRequest("http://localhost/api/sessions/1");
    const res = await DELETE(req, createContext(1));
    const { status, data } = await parseResponse<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(data.id).toBe(1);
    expect(mocks.prisma.lessonSession.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("returns 404 for a missing session", async () => {
    mocks.prisma.lessonSession.findFirst.mockResolvedValue(null);

    const req = createGetRequest("http://localhost/api/sessions/99999");
    const res = await DELETE(req, createContext(99999));

    expect(res.status).toBe(404);
    expect(mocks.prisma.lessonSession.delete).not.toHaveBeenCalled();
  });
});
