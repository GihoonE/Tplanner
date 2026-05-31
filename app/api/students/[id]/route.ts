import { NextResponse, NextRequest } from "next/server";
import { requireInstructor } from "@/lib/auth/permissions";
import {
  parseOptionalBoundedInteger,
  parseOptionalMonthString,
  parseOptionalRequiredString,
  parseOptionalStudentColor,
  parseOptionalStudentStatus,
  parsePositiveInt,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";

function normalizeStudentStatus(status: unknown) {
  return status === "active" ? "active" : "inactive";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parsePositiveInt(params.id, "id");
    if (!idParam.ok) {
      return NextResponse.json({ error: idParam.error }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { id: idParam.value, instructorId: instructor.userId },
      include: {
        sessions: {
          include: { homework: true },
          orderBy: { start: "desc" },
        },
      },
    });
    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const { sessions, ...rest } = student;
    return NextResponse.json({
      ...rest,
      status: normalizeStudentStatus(rest.status),
      sessions,
    });
  } catch (e) {
    console.error("[GET] /api/students/[id]", e);
    return NextResponse.json(
      { error: "학생을 조회하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parsePositiveInt(params.id, "id");
    if (!idParam.ok) {
      return NextResponse.json({ error: idParam.error }, { status: 400 });
    }
    const numId = idParam.value;
    const body = await _req.json();
    const student = await prisma.student.findFirst({
      where: { id: numId, instructorId: instructor.userId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
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
    } = body;

    const nameParam = parseOptionalRequiredString(name, "name");
    if (!nameParam.ok) return badRequest(nameParam.error);
    const subjectParam = parseOptionalRequiredString(subject, "subject");
    if (!subjectParam.ok) return badRequest(subjectParam.error);
    const gradeParam = parseOptionalRequiredString(grade, "grade");
    if (!gradeParam.ok) return badRequest(gradeParam.error);
    const schoolParam = parseOptionalRequiredString(school, "school");
    if (!schoolParam.ok) return badRequest(schoolParam.error);
    const avatarParam = parseOptionalRequiredString(avatarChar, "avatarChar");
    if (!avatarParam.ok) return badRequest(avatarParam.error);
    const colorParam = parseOptionalStudentColor(color);
    if (!colorParam.ok) return badRequest(colorParam.error);
    const statusParam = parseOptionalStudentStatus(status);
    if (!statusParam.ok) return badRequest(statusParam.error);
    const startDateParam = parseOptionalMonthString(startDate, "startDate");
    if (!startDateParam.ok) return badRequest(startDateParam.error);
    const totalSessionsParam = parseOptionalBoundedInteger(
      totalSessions,
      "totalSessions",
      0,
      10000,
    );
    if (!totalSessionsParam.ok) return badRequest(totalSessionsParam.error);
    const hwCompletionRateParam = parseOptionalBoundedInteger(
      hwCompletionRate,
      "hwCompletionRate",
      0,
      100,
    );
    if (!hwCompletionRateParam.ok) {
      return badRequest(hwCompletionRateParam.error);
    }

    const updated = await prisma.student.update({
      where: { id: numId },
      data: {
        ...(nameParam.value !== undefined && { name: nameParam.value.trim() }),
        ...(subjectParam.value !== undefined && {
          subject: subjectParam.value.trim(),
        }),
        ...(gradeParam.value !== undefined && { grade: gradeParam.value.trim() }),
        ...(schoolParam.value !== undefined && {
          school: schoolParam.value.trim(),
        }),
        ...(colorParam.value !== undefined && {
          color: colorParam.value,
        }),
        ...(avatarParam.value !== undefined && {
          avatarChar: avatarParam.value.trim(),
        }),
        ...(statusParam.value !== undefined && { status: statusParam.value }),
        ...(startDateParam.value !== undefined && {
          startDate: startDateParam.value,
        }),
        ...(totalSessionsParam.value !== undefined && {
          totalSessions: totalSessionsParam.value,
        }),
        ...(hwCompletionRateParam.value !== undefined && {
          hwCompletionRate: hwCompletionRateParam.value,
        }),
      },
    });
    return NextResponse.json({
      ...updated,
      status: normalizeStudentStatus(updated.status),
    });
  } catch (e) {
    console.error("[PATCH] /api/students/[id]", e);
    return NextResponse.json(
      { error: "학생 정보를 수정하는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const instructor = await requireInstructor();
    if (instructor.response) return instructor.response;

    const idParam = parsePositiveInt(params.id, "id");
    if (!idParam.ok) {
      return NextResponse.json({ error: idParam.error }, { status: 400 });
    }

    const existing = await prisma.student.findFirst({
      where: { id: idParam.value, instructorId: instructor.userId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    await prisma.student.delete({ where: { id: idParam.value } });

    return NextResponse.json({
      ok: true,
      id: existing.id,
    });
  } catch (e) {
    console.error("[DELETE] /api/students/[id]", e);
    return NextResponse.json(
      { error: "학생을 삭제하는 데 실패했습니다" },
      { status: 500 },
    );
  }
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
