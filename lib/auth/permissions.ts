import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserRole, type UserRole } from "@/lib/auth/roles";

type InstructorAuth =
  | { userId: string; response?: never }
  | { userId?: never; response: NextResponse };

type ParentAuth =
  | { userId: string; response?: never }
  | { userId?: never; response: NextResponse };

type ViewerAuth =
  | { userId: string; role: UserRole; response?: never }
  | { userId?: never; role?: never; response: NextResponse };

async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  const role = await getUserRole(userId);
  if (!role) {
    return {
      response: NextResponse.json(
        { error: "역할 설정이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  return { userId, role };
}

export async function requireInstructor(): Promise<InstructorAuth> {
  const user = await requireUser();
  if (user.response) return { response: user.response };

  const { userId, role } = user;
  if (role !== "instructor") {
    return {
      response: NextResponse.json(
        { error: "강사 권한이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  return { userId };
}

export async function requireParent(): Promise<ParentAuth> {
  const user = await requireUser();
  if (user.response) return { response: user.response };

  const { userId, role } = user;
  if (role !== "parent") {
    return {
      response: NextResponse.json(
        { error: "학부모 권한이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  return { userId };
}

export async function requireViewer(): Promise<ViewerAuth> {
  const user = await requireUser();
  if (user.response) return { response: user.response };
  return user;
}

export function studentAccessWhere(viewer: { userId: string; role: UserRole }) {
  return viewer.role === "instructor"
    ? { instructorId: viewer.userId }
    : { parentLinks: { some: { parentId: viewer.userId } } };
}

export function sessionStudentAccessWhere(viewer: {
  userId: string;
  role: UserRole;
}) {
  return viewer.role === "instructor"
    ? { instructorId: viewer.userId }
    : { parentLinks: { some: { parentId: viewer.userId } } };
}
