import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, ...(headers && { headers }) });
}

export function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
