import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

type RevocationResult = {
  provider: string;
  revoked: boolean;
};

async function revokeGoogleToken(token: string) {
  const body = new URLSearchParams({ token });
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return response.ok;
}

async function revokeKakaoToken(token: string) {
  const response = await fetch("https://kapi.kakao.com/v1/user/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.ok;
}

async function revokeAccount(account: {
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
}): Promise<RevocationResult> {
  try {
    if (account.provider === "google") {
      const token = account.refresh_token ?? account.access_token;
      return {
        provider: account.provider,
        revoked: token ? await revokeGoogleToken(token) : false,
      };
    }

    if (account.provider === "kakao") {
      return {
        provider: account.provider,
        revoked: account.access_token
          ? await revokeKakaoToken(account.access_token)
          : false,
      };
    }
  } catch {
    return { provider: account.provider, revoked: false };
  }

  return { provider: account.provider, revoked: false };
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      provider: true,
      access_token: true,
      refresh_token: true,
    },
  });

  const results = await Promise.all(accounts.map(revokeAccount));

  return NextResponse.json({ results });
}
