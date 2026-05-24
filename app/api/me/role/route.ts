import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isValidRole(role: unknown): role is "instructor" | "parent" {
  return role === "instructor" || role === "parent";
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    if (!isValidRole(body.role)) {
      return NextResponse.json(
        { error: "role은 instructor 또는 parent여야 합니다." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (user.role) {
      return NextResponse.json(
        { error: "이미 역할이 설정되어 있습니다." },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: body.role },
      select: { id: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/me/role]", e);
    return NextResponse.json(
      { error: "역할 설정에 실패했습니다." },
      { status: 500 },
    );
  }
}
