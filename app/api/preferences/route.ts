import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { TZ_CATALOG } from "@/lib/constants";
import { requireSignedIn } from "@/lib/auth/permissions";
import type { ExtraTimezonePreference } from "@/types";
import { ok, err } from "@/lib/api/response";

const DEFAULT_TIMEZONE = "Asia/Seoul";

const DEFAULT_EXTRA_TIMEZONES: ExtraTimezonePreference[] = [];

function isSupportedTimezone(value: unknown): value is string {
  return (
    typeof value === "string" &&
    TZ_CATALOG.some((timezone) => timezone.timeZone === value)
  );
}

function normalizeExtraTimezones(
  value: unknown,
  primaryTimezone: string,
): ExtraTimezonePreference[] {
  if (!Array.isArray(value)) return DEFAULT_EXTRA_TIMEZONES;

  const normalized = new Map<string, ExtraTimezonePreference>();

  for (const item of value) {
    if (typeof item === "string") {
      if (isSupportedTimezone(item) && item !== primaryTimezone) {
        normalized.set(item, { timeZone: item, on: true });
      }
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const candidate = item as Record<string, unknown>;
    const timeZone = candidate.timeZone;
    if (!isSupportedTimezone(timeZone) || timeZone === primaryTimezone) continue;

    normalized.set(timeZone, {
      timeZone,
      on: typeof candidate.on === "boolean" ? candidate.on : true,
    });
  }

  return Array.from(normalized.values());
}

function serializePreference(preference: {
  primaryTimezone: string;
  extraTimezones: unknown;
}) {
  const primaryTimezone = isSupportedTimezone(preference.primaryTimezone)
    ? preference.primaryTimezone
    : DEFAULT_TIMEZONE;

  return {
    primaryTimezone,
    extraTimezones: normalizeExtraTimezones(
      preference.extraTimezones,
      primaryTimezone,
    ),
  };
}

export async function GET() {
  try {
    const auth = await requireSignedIn();
    if (auth.response) return auth.response;
    const { userId } = auth;

    // Use findUnique + create fallback — a GET must not write unless necessary.
    let preference = await prisma.userPreference.findUnique({ where: { userId } });
    if (!preference) {
      preference = await prisma.userPreference.create({
        data: {
          userId,
          primaryTimezone: DEFAULT_TIMEZONE,
          extraTimezones: DEFAULT_EXTRA_TIMEZONES,
        },
      });
    }

    return ok(serializePreference(preference), 200, {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    });
  } catch (e) {
    console.error("[GET /api/preferences]", e);
    return err("환경설정을 불러오는 데 실패했습니다.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSignedIn();
    if (auth.response) return auth.response;
    const { userId } = auth;

    const body = await request.json();
    const { primaryTimezone } = body;

    if (!isSupportedTimezone(primaryTimezone)) {
      return err("지원하지 않는 타임존입니다.", 400);
    }
    const extraTimezones = normalizeExtraTimezones(body.extraTimezones, primaryTimezone);

    const preference = await prisma.userPreference.upsert({
      where: { userId },
      update: { primaryTimezone, extraTimezones },
      create: { userId, primaryTimezone, extraTimezones },
    });

    return ok(serializePreference(preference));
  } catch (e) {
    console.error("[PATCH /api/preferences]", e);
    return err("환경설정 저장에 실패했습니다.", 500);
  }
}
