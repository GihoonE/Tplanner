import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "instructor" | "parent" | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "instructor" | "parent" | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: "instructor" | "parent" | null;
  }
}
