export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await errorMessage(res, "데이터를 불러오지 못했습니다."));
  }
  return parseJsonResponse<T>(res, "데이터 응답 형식이 올바르지 않습니다.");
}

export async function apiJson<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, "요청 처리에 실패했습니다."));
  }
  return parseJsonResponse<T>(res, "요청 응답 형식이 올바르지 않습니다.");
}

async function errorMessage(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}

async function parseJsonResponse<T>(res: Response, fallback: string) {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(fallback);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(fallback);
  }
}
