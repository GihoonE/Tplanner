import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { isUserRole } from "@/lib/auth/roles";

const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60;
const ONE_HOUR_IN_SECONDS = 60 * 60;

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = IS_PRODUCTION
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

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
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: IS_PRODUCTION,
        maxAge: THREE_DAYS_IN_SECONDS,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID ?? process.env.KAKAO_API_KEY ?? "",
      clientSecret: process.env.AUTH_KAKAO_SECRET ?? "",
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: { scope: "profile_nickname profile_image account_email" },
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
              is_email_valid?: boolean;
              is_email_verified?: boolean;
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
      const kakaoEmail = 
          kakaoProfile?.kakao_account?.is_email_verified &&
          kakaoProfile?.kakao_account?.is_email_valid ? kakaoProfile.kakao_account.email : undefined;
      const nextEmail = user.email ?? kakaoEmail;
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
      // On first sign-in: fetch the role from DB and embed it in the token.
      // This is the ONLY time we hit the DB here — subsequent requests read
      // the role straight from the stored JWT, saving one DB round-trip per request.
      if (user) {
        const fetchRole = () =>
          prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
        let dbUser;
        try {
          dbUser = await fetchRole();
        } catch {
          // One retry for transient DB issues; throws on second failure → visible sign-in error
          dbUser = await fetchRole();
        }
        token.role = isUserRole(dbUser?.role) ? dbUser.role : null;
        return token;
      }

      // When the session is explicitly updated (e.g. after role assignment)
      // sync the new role into the token so it takes effect immediately.
      if (trigger === "update" && session?.role) {
        token.role = session.role;
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
