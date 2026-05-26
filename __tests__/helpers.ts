import { NextRequest } from "next/server";

export function createGetRequest(url: string) {
  return new NextRequest(url, { method: "GET" });
}

export function createJsonRequest(
  url: string,
  method: string,
  body: unknown,
) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function parseResponse<T>(response: Response) {
  return {
    status: response.status,
    data: (await response.json()) as T,
  };
}
