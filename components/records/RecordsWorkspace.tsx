"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RecordList } from "@/components/records/RecordList";
import { RecordEditor } from "@/components/records/RecordEditor";
import { NewSessionRecordModal } from "@/components/records/NewSessionRecordModal";
import type { Session, Student, Understanding, Focus } from "@/types";

export function RecordsWorkspace() {
  const { data: authSession } = useSession();
  const readOnly = authSession?.user?.role === "parent";
  const searchParams = useSearchParams();
  const initialSessionId = Number(searchParams.get("session"));
  const initialStudentSearch =
    Number.isSafeInteger(initialSessionId) ? "" : (searchParams.get("student") ?? "");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadState("loading");
      setLoadError(null);
      try {
        const [sRes, stRes] = await Promise.all([
          fetch("/api/sessions"),
          fetch("/api/students"),
        ]);
        if (!sRes.ok) throw new Error("수업 목록을 불러오지 못했습니다.");
        if (!stRes.ok) throw new Error("학생 목록을 불러오지 못했습니다.");
        const rawSessions = (await sRes.json()) as {
          id: number;
          studentId: number | null;
          start: string;
          end: string;
          place: string;
          notes: string;
          understanding: string;
          focus: string;
          homework: { id: number; text: string; done: boolean }[];
        }[];
        const rawStudents = (await stRes.json()) as Student[];
        if (cancelled) return;
        setSessions(
          rawSessions.map(
            (row): Session => ({
              id: row.id,
              studentId: row.studentId,
              start: new Date(row.start),
              end: new Date(row.end),
              place: row.place,
              notes: row.notes,
              understanding: row.understanding as Understanding,
              focus: row.focus as Focus,
              homework: row.homework,
            }),
          ),
        );
        setStudents(rawStudents);
        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.",
          );
          setLoadState("error");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadState !== "ready") return;
    setActiveId((aid) => {
      if (sessions.length === 0) return null;
      if (
        Number.isSafeInteger(initialSessionId) &&
        sessions.some((s) => s.id === initialSessionId)
      ) {
        return initialSessionId;
      }
      if (aid !== null && sessions.some((s) => s.id === aid)) return aid;
      return sessions[0].id;
    });
  }, [initialSessionId, loadState, sessions]);

  const onSessionChange = useCallback((next: Session) => {
    setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }, []);

  const onDeleted = useCallback((id: number) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveId((aid) => {
        if (aid !== id) return aid;
        return next[0]?.id ?? null;
      });
      return next;
    });
  }, []);

  const onSessionCreated = useCallback((created: Session) => {
    setSessions((prev) => {
      const next = [created, ...prev].sort(
        (a, b) => b.start.getTime() - a.start.getTime(),
      );
      return next;
    });
    setActiveId(created.id);
  }, []);

  const activeSession =
    activeId != null ? (sessions.find((s) => s.id === activeId) ?? null) : null;
  const activeStudent = activeSession
    ? students.find((s) => s.id === activeSession.studentId)
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-[54px] flex-shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-6">
        <span className="flex-1 text-[15px] font-extrabold tracking-tight text-slate-900">
          수업 기록
        </span>
        {!readOnly && (
          <button
            type="button"
            disabled={loadState !== "ready"}
            onClick={() => setNewSessionOpen(true)}
            className="rounded-xl bg-sky-500 px-4 py-2 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(16,67,109,.3)] transition-colors hover:bg-sky-600 disabled:pointer-events-none disabled:opacity-50"
          >
            + 새 기록
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <RecordList
          sessions={sessions}
          students={students}
          activeId={activeId}
          onSelect={setActiveId}
          loading={loadState === "loading"}
          error={loadState === "error" ? loadError : null}
          initialSearch={initialStudentSearch}
        />
        <RecordEditor
          session={activeSession}
          student={activeStudent}
          onSessionChange={onSessionChange}
          onDeleted={onDeleted}
          readOnly={readOnly}
        />
      </div>

      {!readOnly && (
        <NewSessionRecordModal
          open={newSessionOpen}
          onClose={() => setNewSessionOpen(false)}
          students={students}
          onCreated={onSessionCreated}
        />
      )}
    </div>
  );
}
