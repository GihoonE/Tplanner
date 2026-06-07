import { NextRequest } from "next/server";
import { requireSignedIn } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api/response";

function isValidRole(role: unknown): role is "instructor" | "parent" {
  return role === "instructor" || role === "parent";
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSignedIn();
    if (auth.response) return auth.response;
    const { userId } = auth;

    const body = await request.json();
    if (!isValidRole(body.role)) {
      return err("role은 instructor 또는 parent여야 합니다.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) return err("사용자를 찾을 수 없습니다.", 404);
    if (user.role) return err("이미 역할이 설정되어 있습니다.", 409);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: body.role },
      select: { id: true, role: true },
    });

    return ok(updated);
  } catch (e) {
    console.error("[PATCH /api/me/role]", e);
    return err("역할 설정에 실패했습니다.", 500);
  }
}
