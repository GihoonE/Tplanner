import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { isUserRole } from "@/lib/auth/roles";

const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60;
const ONE_HOUR_IN_SECONDS = 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: THREE_DAYS_IN_SECONDS,
    updateAge: ONE_HOUR_IN_SECONDS,
  },
  jwt: {
    maxAge: THREE_DAYS_IN_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Kakao({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.AUTH_KAKAO_ID ?? process.env.KAKAO_API_KEY ?? "",
      clientSecret: process.env.AUTH_KAKAO_SECRET ?? "",
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: { scope: "profile_nickname profile_image" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.id) return true;

      const kakaoProfile = profile as
        | {
            kakao_account?: {
              email?: string;
              profile?: {
                nickname?: string;
                profile_image_url?: string;
                thumbnail_image_url?: string;
              };
            };
            properties?: {
              nickname?: string;
              profile_image?: string;
              thumbnail_image?: string;
            };
          }
        | undefined;

      const nextName =
        user.name ??
        kakaoProfile?.kakao_account?.profile?.nickname ??
        kakaoProfile?.properties?.nickname;
      const nextEmail = user.email ?? kakaoProfile?.kakao_account?.email;
      const nextImage =
        user.image ??
        kakaoProfile?.kakao_account?.profile?.profile_image_url ??
        kakaoProfile?.kakao_account?.profile?.thumbnail_image_url ??
        kakaoProfile?.properties?.profile_image ??
        kakaoProfile?.properties?.thumbnail_image;

      const data = {
        ...(nextName ? { name: nextName } : {}),
        ...(nextEmail ? { email: nextEmail } : {}),
        ...(nextImage ? { image: nextImage } : {}),
      };

      if (Object.keys(data).length > 0) {
        await prisma.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            ...data,
          },
          update: data,
        }).catch(() => {
          // OAuth sign-in should not fail just because optional profile sync failed.
        });
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        token.role = isUserRole(dbUser?.role) ? dbUser.role : null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? null;
      }
      return session;
    },
  },
});
