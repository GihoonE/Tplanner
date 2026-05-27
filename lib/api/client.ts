export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await errorMessage(res, "데이터를 불러오지 못했습니다."));
  }
  return (await res.json()) as T;
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
  return (await res.json()) as T;
}

async function errorMessage(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}
