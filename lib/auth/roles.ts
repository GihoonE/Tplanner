import { prisma } from "@/lib/db";

export type UserRole = "instructor" | "parent";

export function isUserRole(role: unknown): role is UserRole {
  return role === "instructor" || role === "parent";
}

export function roleHomePath(role: UserRole) {
  return role === "parent" ? "/parent" : "/dashboard";
}

export async function getUserRole(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return isUserRole(user?.role) ? user.role : null;
}
