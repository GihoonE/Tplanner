import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TZ_CATALOG } from "@/lib/constants";

const PREFERENCE_ID = 1;
const DEFAULT_TIMEZONE = "Asia/Seoul";

function isSupportedTimezone(value: unknown): value is string {
  return (
    typeof value === "string" &&
    TZ_CATALOG.some((timezone) => timezone.timeZone === value)
  );
}

function serializePreference(preference: { primaryTimezone: string }) {
  return {
    primaryTimezone: isSupportedTimezone(preference.primaryTimezone)
      ? preference.primaryTimezone
      : DEFAULT_TIMEZONE,
  };
}

export async function GET() {
  try {
    const preference = await prisma.appPreference.upsert({
      where: { id: PREFERENCE_ID },
      update: {},
      create: {
        id: PREFERENCE_ID,
        primaryTimezone: DEFAULT_TIMEZONE,
      },
    });

    return NextResponse.json(serializePreference(preference));
  } catch (e) {
    console.error("[GET /api/preferences]", e);
    return NextResponse.json(
      { error: "환경설정을 불러오는 데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { primaryTimezone } = body;

    if (!isSupportedTimezone(primaryTimezone)) {
      return NextResponse.json(
        { error: "지원하지 않는 타임존입니다." },
        { status: 400 },
      );
    }

    const preference = await prisma.appPreference.upsert({
      where: { id: PREFERENCE_ID },
      update: { primaryTimezone },
      create: {
        id: PREFERENCE_ID,
        primaryTimezone,
      },
    });

    return NextResponse.json(serializePreference(preference));
  } catch (e) {
    console.error("[PATCH /api/preferences]", e);
    return NextResponse.json(
      { error: "환경설정 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
